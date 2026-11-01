import { CLOSE_CODES, type Hello } from "@probex-platform/protocol";
import { isIP, connect as netConnect, type Socket, type TcpNetConnectOpts } from "node:net";
import { connect as tlsConnect, type ConnectionOptions } from "node:tls";
import { WebSocket, type ClientOptions, type RawData } from "ws";

import type { HubTarget } from "./hub-url.js";
import { checkFirstFrame } from "./welcome.js";
import { readErrorCode } from "../logger/index.js";

/** Why an attempt ended; `message` never holds the token, the URL's userinfo or query, or text from the hub. */
export interface AttemptFailure {
  level: "warn" | "error";
  message: string;
  /** Names the problem, so the logger collapses repeats. */
  key: string;
  /** The hub refused the session: the next wait is the longest one. */
  isRejection: boolean;
}

/** What an attempt tells its connector. */
export interface AttemptEvents {
  onWelcome(): void;
  /** Called at most once, and never after `stop()`. */
  onEnd(failure: AttemptFailure): void;
}

/** What one attempt connects to and says first. */
export interface AttemptSettings {
  target: HubTarget;
  token: string | undefined;
  hello: Hello;
}

// The protocol's limits: docs/api/protocol.md#hello
const HANDSHAKE_TIMEOUT_MS = 10_000;
const WELCOME_TIMEOUT_MS = 10_000;
const MAX_FRAME_BYTES = 1_048_576;
// ws waits this long for the hub to finish a closing handshake before it destroys the socket; its timer is not
// unref'd, so this is how long a closing socket can hold the host process
const CLOSING_HANDSHAKE_TIMEOUT_MS = 1000;

// @types/ws 8.18 does not declare `closeTimeout`, which ws has had since 8.19
type SocketOptions = ClientOptions & { closeTimeout: number };

// What ws passes to `createConnection`: the request options, where `path` is the HTTP path
type ConnectOptions = TcpNetConnectOpts & ConnectionOptions & { path?: string };

// Replaces ws's own netConnect/tlsConnect so the socket is unref'd before it connects: the connector never keeps
// the host process alive. `path` is dropped: net.connect would take it for a Unix socket.
const createUnrefConnection =
  (isSecure: boolean) =>
  (options: ConnectOptions): Socket => {
    const socket = isSecure
      ? tlsConnect({ ...options, path: undefined, servername: toServername(options.host) })
      : netConnect({ ...options, path: undefined });
    socket.unref();
    return socket;
  };

// SNI takes a name only; an IP there makes Node print a deprecation warning to the host's stderr
const toServername = (host: string | undefined): string => (host === undefined || isIP(host) !== 0 ? "" : host);

const createSocketOptions = ({ target, token }: AttemptSettings): SocketOptions => ({
  headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
  perMessageDeflate: false,
  followRedirects: false,
  rejectUnauthorized: true,
  maxPayload: MAX_FRAME_BYTES,
  handshakeTimeout: HANDSHAKE_TIMEOUT_MS,
  closeTimeout: CLOSING_HANDSHAKE_TIMEOUT_MS,
  // ws types this as net.createConnection with all its overloads; ws itself calls it with one options object
  createConnection: createUnrefConnection(target.isSecure) as ClientOptions["createConnection"],
});

// With ws's default binaryType every message is one Buffer
const toText = (data: RawData, isBinary: boolean): string | undefined =>
  isBinary || !Buffer.isBuffer(data) ? undefined : data.toString("utf8");

// Only the code: an error's message can quote the URL or a response header. The code is part of the key too, so a
// changed cause, such as a rotated certificate during an outage, is logged in full instead of as a repeat.
const describeError = (
  level: AttemptFailure["level"],
  message: string,
  { key, error }: { key: string; error: unknown },
): AttemptFailure => {
  const code = readErrorCode(error) ?? "";
  const text = code === "" ? message : `${message} (${code})`;
  return { level, message: text, key: `${key}:${code}`, isRejection: false };
};

const describeClose = (code: number): AttemptFailure => {
  if (code === CLOSE_CODES.incompatibleVersion) {
    const message = "the hub does not support this SDK's protocol version (close code 4426)";
    return { level: "error", message, key: "hub-incompatible-version", isRejection: true };
  }

  if (code === CLOSE_CODES.protocolError) {
    const message = "the hub closed the session with a protocol error (close code 4400)";
    return { level: "error", message, key: "hub-protocol-error", isRejection: true };
  }

  // The close reason is the hub's text and is never logged
  const message = `the connection to the hub closed (close code ${String(code)})`;
  return { level: "warn", message, key: `hub-closed:${String(code)}`, isRejection: false };
};

const describeStatus = (statusCode: number | undefined): AttemptFailure => {
  const status = String(statusCode);
  if (statusCode === 401 || statusCode === 403) {
    const message = `the hub rejected the token (HTTP ${status}); check PROBEX_TOKEN`;
    return { level: "error", message, key: "hub-unauthorized", isRejection: true };
  }

  // A redirect is not followed: its Location, like every response header, is never logged
  const message = `the hub answered the WebSocket upgrade with HTTP ${status}`;
  return { level: "warn", message, key: `hub-unexpected-response:${status}`, isRejection: false };
};

/** One connection to the hub: opens the socket, sends `hello` and waits for `welcome`. */
export class Attempt {
  private readonly socket: WebSocket;
  private hasEnded = false;
  private isWelcomed = false;
  private welcomeTimer: NodeJS.Timeout | undefined;

  /** Opens the socket; throws only when ws rejects the options, before any I/O. */
  constructor(
    private readonly settings: AttemptSettings,
    private readonly events: AttemptEvents,
  ) {
    this.socket = new WebSocket(settings.target.href, createSocketOptions(settings));
    // Each listener stays for the socket's whole life: ws can emit `error` a tick after terminate(), and an
    // `error` without a listener would crash the host app
    this.socket.on("error", (error) => {
      this.guard(() => {
        this.onError(error);
      });
    });
    this.socket.on("unexpected-response", (_request, response) => {
      this.guard(() => {
        this.onUnexpectedResponse(response.statusCode);
      });
    });
    this.socket.on("open", () => {
      this.guard(() => {
        this.onOpen();
      });
    });
    this.socket.on("message", (data, isBinary) => {
      this.guard(() => {
        this.onMessage(data, isBinary);
      });
    });
    this.socket.on("close", (code) => {
      this.guard(() => {
        this.end(describeClose(code));
      });
    });
  }

  /** Ends the attempt without reporting it: closes an open socket with 1000, aborts one still connecting. */
  stop(): Promise<void> {
    this.hasEnded = true;
    clearTimeout(this.welcomeTimer);
    if (this.socket.readyState === WebSocket.CLOSED) {
      return Promise.resolve();
    }

    const closed = new Promise<void>((resolve) => {
      this.socket.once("close", () => {
        resolve();
      });
    });
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.close(1000);
    } else if (this.socket.readyState === WebSocket.CONNECTING) {
      this.socket.terminate();
    }

    return closed;
  }

  // Socket and timer callbacks are a boundary: nothing thrown here may reach the host app. A failure ends the
  // attempt, since it may have left the welcome timer unarmed and the connector waiting forever.
  private guard(run: () => void): void {
    try {
      run();
    } catch (error) {
      this.abandon(error);
    }
  }

  private abandon(error: unknown): void {
    try {
      this.end(describeError("error", "the connector hit an unexpected error", { key: "internal-error", error }));
      this.socket.terminate();
    } catch {
      // Already inside the boundary's last resort; there is nowhere safer to report a second failure
    }
  }

  private end(failure: AttemptFailure): void {
    if (this.hasEnded) {
      return;
    }

    this.hasEnded = true;
    clearTimeout(this.welcomeTimer);
    this.events.onEnd(failure);
  }

  private onError(error: Error): void {
    if (readErrorCode(error) === "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH") {
      const message = "the hub sent a frame over 1 MiB";
      this.end({ level: "error", message, key: "hub-frame-too-large", isRejection: true });
      return;
    }

    if (this.isWelcomed) {
      this.end(describeError("warn", "the connection to the hub dropped", { key: "hub-dropped", error }));
      return;
    }

    const message = `could not connect to the hub at ${this.settings.target.description}`;
    this.end(describeError("warn", message, { key: "hub-unreachable", error }));
  }

  private onUnexpectedResponse(statusCode: number | undefined): void {
    this.end(describeStatus(statusCode));
    // With an `unexpected-response` listener ws leaves the request open; this aborts it
    this.socket.terminate();
  }

  private onOpen(): void {
    if (this.hasEnded) {
      return;
    }

    // The only frame before `welcome` (ADR 0009)
    this.socket.send(JSON.stringify(this.settings.hello));
    this.welcomeTimer = setTimeout(() => {
      this.guard(() => {
        this.end({
          level: "warn",
          message: "the hub sent no welcome within 10 s",
          key: "hub-no-welcome",
          isRejection: false,
        });
        this.socket.terminate();
      });
    }, WELCOME_TIMEOUT_MS);
    this.welcomeTimer.unref();
  }

  private onMessage(data: RawData, isBinary: boolean): void {
    // Messages after `welcome` are handled by a later change; until then they are ignored
    if (this.hasEnded || this.isWelcomed) {
      return;
    }

    const check = checkFirstFrame(toText(data, isBinary));
    if (!check.ok) {
      // The reason is fixed text, so each kind of protocol error collapses on its own
      this.end({ level: "error", message: check.reason, key: `hub-protocol-error:${check.reason}`, isRejection: true });
      // A closing handshake, not terminate(), so the hub receives the code
      this.socket.close(CLOSE_CODES.protocolError);
      return;
    }

    this.isWelcomed = true;
    clearTimeout(this.welcomeTimer);
    this.events.onWelcome();
  }
}
