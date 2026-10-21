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

The state of a [`Connector`](#connector): `disconnected` before `connect()` and between reconnect attempts, `closed`
after `close()`.

```ts
import type { ConnectorStatus } from "@probex-platform/protocol";

const canSend = (status: ConnectorStatus): boolean => status === "connected";
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
