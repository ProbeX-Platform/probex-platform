# @probex-platform/sdk connector API

## Installation

Part of [`@probex-platform/sdk`](overview.md#installation).

## Exports

### `HubConnector`

```ts
class HubConnector implements Connector {
  constructor(options?: HubConnectorOptions);
  connect(): void;
  send(message: Message): void;
  onMessage(handler: (message: Message) => void): () => void;
  onStatus(handler: (status: ConnectorStatus) => void): () => void;
  close(): Promise<void>;
}
```

The default connector: carries protocol messages between the SDK and the hub over one WebSocket. The SDK creates
one from its own config; create it yourself only to tune it or to hand it to the SDK. It implements
[`Connector`](../protocol.md#connector), so a custom connector can replace it.

**Parameters**

Each option is resolved once, in the constructor: the passed value, then its environment variable, then the
default. Only values that differ per deployment have an environment variable. See
[ADR 0003](../../adr/0003-configure-the-connector-from-options-then-env.md).

- `options.url` — `string`, env `PROBEX_HUB_URL`. The hub's WebSocket URL, `ws://` or `wss://`. No default.
- `options.logger` — [`Logger`](#logger). Default: `console` for `warn` and `error`, prefixed with `[probex]`.
- `options.buffer.maxMessages` — `number`, default `1000`. Messages kept while they wait to be sent.
- `options.buffer.maxBytes` — `number`, default `1048576` (1 MiB). Serialized size of the kept messages.
- `options.batch.maxMessages` — `number`, default `100`. A batch is sent when it reaches any of the three batch
  limits.
- `options.batch.maxBytes` — `number`, default `65536` (64 KiB). A larger single message is sent on its own.
- `options.batch.flushIntervalMs` — `number`, default `100`. The longest a message waits for its batch.
- `options.rateLimit.bytesPerSecond` — `number`, default `1048576` (1 MiB/s). Average outgoing rate; a batch
  waits in the buffer until the budget allows it.
- `options.reconnect.minDelayMs` — `number`, default `1000`. The first reconnect delay; it doubles with jitter
  after each failed attempt.
- `options.reconnect.maxDelayMs` — `number`, default `30000`. The longest reconnect delay.
- `options.closeTimeoutMs` — `number`, default `5000`. How long `close()` keeps sending buffered messages.

**Methods**

- `connect()` — starts connecting in the background and returns at once. Reconnects after every disconnect until
  `close()`. A second call does nothing.
- `send(message)` — puts `message` in the buffer; it goes to the hub in a batch, paced by the rate limit. When the
  buffer is full, the oldest messages are dropped and a warning is logged.
- `onMessage(handler)` — calls `handler` with every message from the hub. Returns a function that removes it.
- `onStatus(handler)` — calls `handler` with the new [`ConnectorStatus`](../protocol.md#connectorstatus) on every
  change. Returns a function that removes it.
- `close()` — stops reconnecting, sends buffered messages for up to `closeTimeoutMs`, drops the rest, closes the
  socket and resolves. Handlers are not called after it resolves.

Batching and rate limiting: see [ADR 0005](../../adr/0005-batch-and-rate-limit-messages-in-the-connector.md).

**Returns** — a connector with status `disconnected`; it does no I/O until `connect()`.

**Errors** — no method throws and `close()` never rejects. Instead:

- No `url`, or not a `ws://` / `wss://` URL: `connect()` logs an error and the status stays `disconnected`.
- An invalid number option: a warning is logged and the default is used.
- The hub is unreachable or the connection drops: the status becomes `disconnected`, a warning is logged and the
  connector reconnects.
- A handler or the logger throws: the error is caught and logged; other handlers still run.
- `connect()` or `send()` after `close()`: a warning is logged and nothing happens.

```ts
import { HubConnector } from "@probex-platform/sdk";

const connector = new HubConnector({ url: "wss://hub.example.com/probex" });
connector.connect();
```

### `HubConnectorOptions`

```ts
interface HubConnectorOptions {
  url?: string;
  logger?: Logger;
  buffer?: { maxMessages?: number; maxBytes?: number };
  batch?: { maxMessages?: number; maxBytes?: number; flushIntervalMs?: number };
  rateLimit?: { bytesPerSecond?: number };
  reconnect?: { minDelayMs?: number; maxDelayMs?: number };
  closeTimeoutMs?: number;
}
```

The options of [`HubConnector`](#hubconnector); every field is optional and described there.

### `Logger`

```ts
interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}
```

Where the connector writes its logs. `console`, pino and winston loggers fit as they are.

**Errors** — a logger method that throws is ignored; the connector keeps working.

```ts
import pino from "pino";
import { HubConnector } from "@probex-platform/sdk";

const connector = new HubConnector({ logger: pino({ name: "probex" }) });
```

## Usage

In most apps the SDK creates the connector: set `PROBEX_HUB_URL` and nothing else. To run one yourself:

```ts
import { HubConnector } from "@probex-platform/sdk";

// url falls back to PROBEX_HUB_URL
const connector = new HubConnector({ batch: { flushIntervalMs: 250 } });

const offStatus = connector.onStatus((status) => {
  console.info("probex hub:", status);
});
const offMessage = connector.onMessage((message) => {
  // a message from the hub
});

connector.connect();
connector.send(message); // any protocol message, buffered until connected

process.once("SIGTERM", async () => {
  offMessage();
  offStatus();
  await connector.close();
});
```
