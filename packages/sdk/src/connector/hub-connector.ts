import type { Connector, ConnectorStatus, Message } from "@probex-platform/protocol";
import { randomUUID } from "node:crypto";

import { Attempt, type AttemptEvents, type AttemptFailure } from "./attempt.js";
import { Backoff } from "./backoff.js";
import { resolveConnectorConfig } from "./config.js";
import { HandlerList } from "./handlers.js";
import { buildHello } from "./hello.js";
import { checkHubTarget, type HubTarget } from "./hub-url.js";
import type { HubConnectorOptions, ResolvedConnectorOptions } from "./options.js";
import { isRecord } from "./read-field.js";
import { readErrorCode, type SdkLogger } from "../logger/index.js";

const COMPONENT = "connector";

const doNothing = (): void => {
  // A handler added after close() is never called, so there is nothing to remove
};

/** The default `Connector`: carries protocol messages between the SDK and the hub over one WebSocket. */
export class HubConnector implements Connector {
  private readonly options: ResolvedConnectorOptions;
  private readonly logger: SdkLogger;
  // One per connector, the same across reconnects, so the hub can tell a reconnect from a new instance
  private readonly instanceId = randomUUID();
  private readonly backoff: Backoff;
  private readonly statusHandlers: HandlerList<ConnectorStatus>;
  private readonly messageHandlers: HandlerList<Message>;
  private readonly attemptEvents: AttemptEvents;
  private status: ConnectorStatus = "disconnected";
  private hasStarted = false;
  private target: HubTarget | undefined;
  private attempt: Attempt | undefined;
  private reconnectTimer: NodeJS.Timeout | undefined;
  private closing: Promise<void> | undefined;

  /** Resolves the options once; does no I/O until `connect()`. */
  constructor(options?: HubConnectorOptions) {
    const { options: resolved, logger } = resolveConnectorConfig(options);
    this.options = resolved;
    this.logger = logger;
    this.backoff = new Backoff(resolved.reconnect.minDelayMs, resolved.reconnect.maxDelayMs);
    this.statusHandlers = new HandlerList((error) => {
      this.logger.log("error", "a status handler threw", { component: COMPONENT, error });
    });
    this.messageHandlers = new HandlerList((error) => {
      this.logger.log("error", "a message handler threw", { component: COMPONENT, error });
    });
    this.attemptEvents = {
      onWelcome: () => {
        this.onWelcome();
      },
      onEnd: (failure) => {
        this.onAttemptEnd(failure);
      },
    };
  }

  /** Starts connecting in the background and returns at once; a second call does nothing. */
  connect(): void {
    try {
      if (this.isClosing()) {
        this.log("warn", "connect() after close() does nothing", "connect-after-close");
        return;
      }

      if (this.hasStarted) {
        return;
      }

      this.hasStarted = true;
      const check = checkHubTarget(this.options.url, this.options.token);
      if (!check.ok) {
        this.log("error", check.reason, "invalid-hub-target");
        return;
      }

      this.target = check.target;
      // Handlers are never called from inside connect(): the status changes after it returns
      queueMicrotask(() => {
        this.openSafely();
      });
    } catch (error) {
      this.logInternalError(error);
    }
  }

  /** Not sent yet: queueing and batching come with a later change; until then the message is dropped. */
  send(message: Message): void {
    try {
      if (this.isClosing()) {
        this.log("warn", "send() after close() does nothing", "send-after-close");
        return;
      }

      if (this.logger.enabled("debug")) {
        // Read defensively: an app in plain JavaScript can pass anything
        const type: unknown = isRecord(message) ? Reflect.get(message, "type") : undefined;
        const name = typeof type === "string" ? type : "malformed";
        this.log("debug", `a ${name} message was dropped: sending is not supported yet`, "send-dropped");
      }
    } catch (error) {
      this.logInternalError(error);
    }
  }

  /** Adds a handler for messages from the hub; returns a function that removes it. */
  onMessage(handler: (message: Message) => void): () => void {
    return !this.isClosing() ? this.messageHandlers.add(handler) : doNothing;
  }

  /** Adds a handler for status changes; returns a function that removes it. */
  onStatus(handler: (status: ConnectorStatus) => void): () => void {
    return !this.isClosing() ? this.statusHandlers.add(handler) : doNothing;
  }

  /** Stops reconnecting and closes the socket; never rejects, and a second call returns the same promise. */
  close(): Promise<void> {
    this.closing ??= this.shutDown();
    return this.closing;
  }

  private async shutDown(): Promise<void> {
    // Up to its first await an async function runs inside its caller: this keeps handlers out of close()
    await Promise.resolve();
    clearTimeout(this.reconnectTimer);
    const attempt = this.attempt;
    this.attempt = undefined;
    try {
      await attempt?.stop();
    } catch (error) {
      this.logInternalError(error);
    } finally {
      this.setStatus("closed");
      this.statusHandlers.clear();
      this.messageHandlers.clear();
      this.logger.flush();
    }
  }

  // Microtask and timer callbacks are a boundary: a throw there would crash the host app
  private openSafely(): void {
    try {
      this.open();
    } catch (error) {
      this.logInternalError(error);
    }
  }

  private open(): void {
    if (this.isClosing() || this.target === undefined) {
      return;
    }

    this.setStatus("connecting");
    // A status handler may have called close()
    if (this.isClosing()) {
      return;
    }

    const { token, service, labels } = this.options;
    const hello = buildHello({ instanceId: this.instanceId, service, labels });
    this.log("debug", `connecting to the hub at ${this.target.description}`, "connecting");
    try {
      this.attempt = new Attempt({ target: this.target, token, hello }, this.attemptEvents);
    } catch (error) {
      // ws throws only for options the URL check has already ruled out, so this is a bug like any other
      const code = readErrorCode(error);
      const message = `could not open a WebSocket to the hub${code === undefined ? "" : ` (${code})`}`;
      this.onAttemptEnd({ level: "error", message, key: "hub-open-failed", isRejection: false });
    }
  }

  private onWelcome(): void {
    if (this.isClosing()) {
      return;
    }

    this.backoff.reset();
    this.log("info", `connected to the hub at ${this.target?.description ?? "?"}`, "connected");
    this.setStatus("connected");
  }

  private onAttemptEnd(failure: AttemptFailure): void {
    if (this.isClosing()) {
      return;
    }

    this.attempt = undefined;
    try {
      this.log(failure.level, failure.message, failure.key);
      if (failure.isRejection) {
        this.backoff.jumpToMax();
      }

      this.setStatus("disconnected");
    } finally {
      // Whatever failed above, the connector must not stay without an attempt; a status handler may have closed it
      if (!this.isClosing()) {
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(() => {
      this.openSafely();
    }, this.backoff.nextWaitMs());
    this.reconnectTimer.unref();
  }

  // A method, not a field check: TypeScript would narrow the field and miss a close() made by a status handler
  private isClosing(): boolean {
    return this.closing !== undefined;
  }

  private setStatus(next: ConnectorStatus): void {
    if (this.status === next) {
      return;
    }

    this.status = next;
    this.statusHandlers.call(next);
  }

  private log(level: "debug" | "info" | "warn" | "error", message: string, key: string): void {
    this.logger.log(level, message, { component: COMPONENT, key });
  }

  // A bug in the connector itself: only the code is logged, since an error's message may quote a URL
  private logInternalError(error: unknown): void {
    const code = readErrorCode(error);
    const message = `the connector hit an unexpected error${code === undefined ? "" : ` (${code})`}`;
    this.log("error", message, "internal-error");
  }
}
