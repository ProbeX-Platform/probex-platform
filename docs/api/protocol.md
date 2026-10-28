# @probex-platform/protocol API

## Installation

```sh
pnpm add @probex-platform/protocol
```

Types and constants only, for `import` and `require()`. `@probex-platform/sdk` installs it for you; install it yourself to write a custom
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

The protocol version this package describes. Every message carries it in `version`; the message types below are
version 1 and fix `version` to `1`. Additions that old peers can ignore keep it; renaming, removing or retyping
anything a peer reads bumps it.

```ts
import { PROTOCOL_VERSION } from "@probex-platform/protocol";

const speaksSameVersion = (version: number): boolean => version === PROTOCOL_VERSION;
```

### `Message`

```ts
type Message = Hello | Welcome | Breakpoints | BreakpointStatus | Snapshot;
```

Every protocol message: one JSON object with `version` and a `type` string. A peer ignores a message whose `type`
it does not know.

```ts
import type { Message } from "@probex-platform/protocol";

const isHello = (message: Message): boolean => message.type === "hello";
```

### `Hello`

```ts
interface Hello {
  version: 1;
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
  version: 1;
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
  version: 1;
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

### `Breakpoints`

```ts
interface Breakpoints {
  version: 1;
  type: "breakpoints";
  breakpoints: Breakpoint[];
}
```

From the hub: the complete list of [breakpoints](#breakpoint) the instance should have, sent after
[`welcome`](#welcome) and on every change. The SDK sets the new ones, removes those missing from the list and sends
a [`breakpointStatus`](#breakpointstatus) for every listed breakpoint. An empty list removes all of them. An
instance holds at most 100; the rest get status `error`. Why a full list:
[ADR 0010](../adr/0010-send-the-full-breakpoint-set-on-every-change.md).

```ts
import { PROTOCOL_VERSION, type Breakpoints } from "@probex-platform/protocol";

const breakpoints: Breakpoints = {
  version: PROTOCOL_VERSION,
  type: "breakpoints",
  breakpoints: [{ id: "bp-1", file: "src/orders/checkout.ts", line: 42 }],
};
```

### `Breakpoint`

```ts
interface Breakpoint {
  id: string;
  file: string;
  line: number;
  limits?: CaptureLimits;
}
```

One breakpoint in [`breakpoints`](#breakpoints).

- `id` — unique within the list; when an `id` appears again, the SDK uses the first entry and reports the others
  as `error`. A later list with the same `id` and the same fields leaves the breakpoint as it is; a different
  `file`, `line` or `limits` replaces it. Breakpoints with different ids at the same place each get their own
  snapshots.
- `file` — the path as in the repository, separated by `/`, such as `src/orders/checkout.ts`. The SDK matches it to
  the loaded file whose path ends with the most of its segments, through source maps for TypeScript.
- `line` — 1-based line in `file`. A line without code moves to the next line that has code.
- `limits` — [`CaptureLimits`](#capturelimits) for this breakpoint's snapshots.

```ts
import type { Breakpoint } from "@probex-platform/protocol";

const breakpoint: Breakpoint = { id: "bp-1", file: "src/orders/checkout.ts", line: 42, limits: { maxDepth: 2 } };
```

### `CaptureLimits`

```ts
interface CaptureLimits {
  maxDepth?: number;
  maxItems?: number;
  maxStringLength?: number;
}
```

How much of each value a snapshot keeps. The SDK lowers a larger value to its cap.

- `maxDepth` — levels of nested objects below a variable. Default `3`, at most `5`.
- `maxItems` — properties of an object, items of an array or set, entries of a map. Default `20`, at most `100`.
- `maxStringLength` — characters of a string. Default `256`, at most `4096`.

```ts
import type { CaptureLimits } from "@probex-platform/protocol";

const deep: CaptureLimits = { maxDepth: 5, maxItems: 50 };
```

### `BreakpointStatus`

```ts
interface BreakpointStatus {
  version: 1;
  type: "breakpointStatus";
  breakpointId: string;
  status: "pending" | "active" | "rateLimited" | "error";
  message?: string;
}
```

From the SDK: the state of one breakpoint, sent for every breakpoint of each [`breakpoints`](#breakpoints) message
and whenever it changes.

- `pending` — no loaded file matches `file` yet; the breakpoint is set when one loads.
- `active` — set; every hit captures a snapshot within the rate limit.
- `rateLimited` — it hit its rate limit and is off until the limit refills, then `active` again.
- `error` — it cannot be set; `message` says why: invalid fields, a repeated `id`, `file` matches several loaded files, no code at or
  after `line`, the source map cannot be read, or more than 100 breakpoints.

```ts
import { PROTOCOL_VERSION, type BreakpointStatus } from "@probex-platform/protocol";

const status: BreakpointStatus = {
  version: PROTOCOL_VERSION,
  type: "breakpointStatus",
  breakpointId: "bp-1",
  status: "active",
};
```

### `Snapshot`

```ts
interface Snapshot {
  version: 1;
  type: "snapshot";
  breakpointId: string;
  time: number;
  stack: StackFrame[];
  variables: Variable[];
  truncated?: boolean;
}

interface StackFrame {
  function: string;
  file: string;
  line: number;
  column: number;
}

interface Variable {
  name: string;
  value: Value;
}
```

From the SDK: the state of the app at one hit of a breakpoint.

- `time` — milliseconds since the Unix epoch.
- `stack` — the call stack, innermost first, at most 20 frames. `file` is the original source path when the file
  has a source map, otherwise the file's path or URL; `line` and `column` are 1-based.
- `variables` — of the innermost frame: `this`, then the local, block and closure scopes, innermost first; a name
  shadowed by an inner scope appears once. Global variables are not captured.
- `truncated` — `true` when the snapshot reached 64 KiB or 10 ms; values not read by then are `unavailable`.

```ts
import type { Snapshot } from "@probex-platform/protocol";

const total = (snapshot: Snapshot) => snapshot.variables.find((variable) => variable.name === "total")?.value;
```

### `Value`

```ts
type Value =
  | { type: "undefined" }
  | { type: "null" }
  | { type: "boolean"; value: boolean }
  | { type: "number"; value: number | "NaN" | "Infinity" | "-Infinity" | "-0" }
  | { type: "bigint"; value: string }
  | { type: "symbol"; value: string }
  | { type: "string"; value: string; length: number }
  | { type: "function"; name: string }
  | { type: "date"; value: string }
  | { type: "error"; className: string; message: string; stack?: string }
  | { type: "object"; className: string; properties?: Variable[]; truncated?: boolean }
  | { type: "array"; length: number; items?: Value[] }
  | { type: "set"; size: number; items?: Value[] }
  | { type: "map"; size: number; entries?: { key: Value; value: Value }[] }
  | { type: "accessor" }
  | { type: "circular" }
  | { type: "redacted" }
  | { type: "unavailable"; reason: string };
```

One captured value, with its children inline. Why a tree:
[ADR 0011](../adr/0011-encode-snapshot-values-as-a-nested-tree.md). What the [limits](#capturelimits) cut is
marked in place:

- a `string` keeps at most `maxStringLength` characters; `length` is the full length;
- an `array`, `set` or `map` keeps at most `maxItems` children; `length` or `size` is the full count;
- an `object` keeps at most `maxItems` own properties and sets `truncated` when it has more;
- below `maxDepth`, `properties`, `items` and `entries` are left out;
- `circular` stands for an object already on the path from the variable; `accessor` for a getter, which is never
  run; `unavailable` for a value not read because of a limit or a failure, with the `reason`;
- `redacted` stands for a value whose name matches the SDK's
  [redaction rules](sdk/debugger.md#debuggeroptions); it was never read.

A `date` is an ISO 8601 string. A reader shows a `type` it does not know as `unavailable`.

```ts
import type { Value } from "@probex-platform/protocol";

const order: Value = {
  type: "object",
  className: "Order",
  properties: [{ name: "id", value: { type: "string", value: "o-17", length: 4 } }],
};
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
