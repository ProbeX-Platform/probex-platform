# @probex-platform/protocol API

## Installation

```sh
pnpm add @probex-platform/protocol
```

Types and constants only. `@probex-platform/sdk` installs it for you; install it yourself to write a custom
connector or hub.

## Exports

### `Connector`

```ts
interface Connector {
  connect(): void;
  send(message: Message): void;
  onMessage(handler: (message: Message) => void): () => void;
  onStatus(handler: (status: ConnectorStatus) => void): () => void;
  close(): Promise<void>;
}
```

Carries protocol messages between the SDK and a hub. The SDK ships
[`HubConnector`](sdk/connector.md#hubconnector); implement this interface for any other transport. Why this shape:
[ADR 0004](../adr/0004-use-handler-functions-in-the-connector-interface.md).

Every implementation keeps this contract:

- `connect()` returns at once and connects in the background; a second call does nothing.
- `send(message)` returns at once; the connector may buffer, batch or, when full, drop messages.
- `onMessage(handler)` and `onStatus(handler)` return a function that removes the handler.
- `close()` resolves once the connector is closed; no handler is called after that.

**Errors** — no method throws and `close()` never rejects: the connector runs inside the host app. A handler that
throws must not stop the connector or the other handlers.

```ts
import type { Connector } from "@probex-platform/protocol";

function watch(connector: Connector): () => void {
  return connector.onStatus((status) => {
    console.info("connector:", status);
  });
}
```

### `ConnectorStatus`

```ts
type ConnectorStatus = "connecting" | "connected" | "disconnected" | "closed";
```

The state of a [`Connector`](#connector): `disconnected` before `connect()` and between reconnect attempts,
`connecting` until the hub accepts the session with [`welcome`](#welcome), `connected` after it, `closed` after
`close()`.

```ts
import type { ConnectorStatus } from "@probex-platform/protocol";

const canSend = (status: ConnectorStatus): boolean => status === "connected";
```

### `PROTOCOL_VERSION`

```ts
const PROTOCOL_VERSION = 1;
```

The protocol version this package describes. Every message carries it in `version`. Additions that old peers can
ignore keep it; renaming, removing or retyping anything a peer reads bumps it.

```ts
import { PROTOCOL_VERSION } from "@probex-platform/protocol";

const speaksSameVersion = (version: number): boolean => version === PROTOCOL_VERSION;
```

### `Message`

```ts
type Message = Hello | Welcome;
```

Every protocol message: one JSON object with `version` and a `type` string. Breakpoint and snapshot messages join
this union as they are added. A peer ignores a message whose `type` it does not know.

```ts
import type { Message } from "@probex-platform/protocol";

const isHello = (message: Message): boolean => message.type === "hello";
```

### `Hello`

```ts
interface Hello {
  version: typeof PROTOCOL_VERSION;
  type: "hello";
  instanceId: string;
  service?: string;
  labels: Record<string, string>;
  hostname: string;
  pid: number;
  sdk: { name: string; version: string };
  runtime: { name: string; version: string };
}
```

The first message the SDK sends on every connection. `instanceId` is a random UUID that stays the same across
reconnects of one connector; `service` and `labels` are what the hub targets breakpoints by. Why the connector sends
it: [ADR 0009](../adr/0009-run-the-hub-handshake-in-the-connector.md).

Every connector and hub keeps this handshake:

1. The connector sends `hello` as the first frame and nothing else until it receives `welcome`.
2. The hub checks the token on the upgrade request (HTTP 401 or 403 when it is missing or invalid), then replies
   `welcome` within 10 s, or closes with [`CLOSE_CODES`](#close_codes) `incompatibleVersion` or `protocolError`.
3. After `welcome`, the hub sends the full breakpoint state.

```ts
import { PROTOCOL_VERSION, type Hello } from "@probex-platform/protocol";

const hello: Hello = {
  version: PROTOCOL_VERSION,
  type: "hello",
  instanceId: crypto.randomUUID(),
  service: "checkout",
  labels: { region: "eu" },
  hostname: "checkout-7d9f",
  pid: 1,
  sdk: { name: "@probex-platform/sdk", version: "0.1.0" },
  runtime: { name: "node", version: process.versions.node },
};
```

### `Welcome`

```ts
interface Welcome {
  version: typeof PROTOCOL_VERSION;
  type: "welcome";
}
```

The hub's reply to [`hello`](#hello): it accepts the session. A connector reports `connected` and starts sending
other messages only after it.

```ts
import { PROTOCOL_VERSION, type Welcome } from "@probex-platform/protocol";

const welcome: Welcome = { version: PROTOCOL_VERSION, type: "welcome" };
```

### `Batch`

```ts
interface Batch {
  version: typeof PROTOCOL_VERSION;
  type: "batch";
  messages: Message[];
}
```

A frame from the SDK to the hub that carries several messages in order. A hub accepts it alongside single messages;
a connector may send either. Never used for `hello`. Why: [ADR 0005](../adr/0005-batch-and-rate-limit-messages-in-the-connector.md).

```ts
import { PROTOCOL_VERSION, type Batch, type Message } from "@probex-platform/protocol";

const toBatch = (messages: Message[]): Batch => ({ version: PROTOCOL_VERSION, type: "batch", messages });
```

### `CLOSE_CODES`

```ts
const CLOSE_CODES = {
  protocolError: 4400,
  incompatibleVersion: 4426,
} as const;
```

WebSocket close codes a hub uses to end a session: `protocolError` when the first frame is not a valid `hello` or a
frame is not a protocol message, `incompatibleVersion` when it does not speak the `hello`'s `version`.

```ts
import { CLOSE_CODES } from "@probex-platform/protocol";

const isRejected = (code: number): boolean => Object.values<number>(CLOSE_CODES).includes(code);
```

## Usage

A custom connector, here an in-memory one for tests, implements [`Connector`](#connector):

```ts
import type { Connector, ConnectorStatus, Message } from "@probex-platform/protocol";

type Handler<T> = (value: T) => void;

export class MemoryConnector implements Connector {
  readonly sent: Message[] = [];
  private readonly messageHandlers = new Set<Handler<Message>>();
  private readonly statusHandlers = new Set<Handler<ConnectorStatus>>();

  connect(): void {
    this.emit(this.statusHandlers, "connected");
  }

  send(message: Message): void {
    this.sent.push(message);
  }

  onMessage(handler: Handler<Message>): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStatus(handler: Handler<ConnectorStatus>): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  receive(message: Message): void {
    this.emit(this.messageHandlers, message);
  }

  async close(): Promise<void> {
    this.emit(this.statusHandlers, "closed");
    this.messageHandlers.clear();
    this.statusHandlers.clear();
  }

  private emit<T>(handlers: Set<Handler<T>>, value: T): void {
    for (const handler of handlers) {
      try {
        handler(value);
      } catch {
        // a failing handler must not stop the others
      }
    }
  }
}
```
