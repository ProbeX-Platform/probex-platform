# @probex-platform/sdk logger API

## Installation

Part of [`@probex-platform/sdk`](overview.md#installation).

## Exports

### `Logger`

```ts
interface Logger {
  debug(message: string, context: LogContext): void;
  info(message: string, context: LogContext): void;
  warn(message: string, context: LogContext): void;
  error(message: string, context: LogContext): void;
}
```

Where the SDK writes its own problems: pass it as [`logger`](debugger.md#debuggeroptions) to `probex.configure()`
or to a [`HubConnector`](connector.md#hubconnector). `console`, pino and winston fit as they are. Default:
`console`, printing the message only. Design: [logger architecture](../../architecture/sdk/logger.md).

**Parameters**

- `message` — `string`. Complete on its own, such as
  `[probex] connector: hub unreachable, retrying in 4 s: connect ECONNREFUSED`.
- `context` — [`LogContext`](#logcontext), always passed. Plain values for loggers that store structured fields;
  pino drops it, winston merges it. See
  [ADR 0014](../../adr/0014-pass-sdk-logs-as-a-full-message-and-a-context.md).

Only lines at or above [`logLevel`](#loglevel) reach the logger. Repeats of a problem within 60 s arrive as one line
with a count. Every `%` in the message passed to your logger is doubled, so a logger that formats `%s` keeps the context out of the
message. A logger that formats nothing prints it as `%%`: pino called as in [Usage](#usage), winston without
`format.splat()`.

**Errors** — methods are called synchronously and their return value is ignored. A method that throws or returns a
rejected promise is ignored; the SDK keeps working.

```ts
import winston from "winston";
import { probex } from "@probex-platform/sdk";

probex.configure({ logger: winston.createLogger({ transports: [new winston.transports.Console()] }) });
```

### `LogContext`

```ts
interface LogContext {
  component: string;
  breakpointId?: string;
  error?: { name: string; message: string; code?: string; stack?: string };
  count?: number;
}
```

The fields of one log line. New optional fields and new `component` values may come in a minor version.

- `component` — the part of the SDK that wrote the line: `"debugger"` or `"connector"`.
- `breakpointId` — the breakpoint the line is about.
- `error` — the error behind the line, as plain values.
- `count` — on a line that sums up repeats: how many times the problem repeated.

### `LogLevel`

```ts
type LogLevel = "debug" | "info" | "warn" | "error" | "silent";
```

The lowest level the SDK writes; `silent` writes nothing. Set it as `logLevel` in
[`probex.configure()`](debugger.md#debuggeroptions) or a [`HubConnector`](connector.md#hubconnectoroptions), or with
`PROBEX_LOG_LEVEL`. Default `warn`. Lines below it are dropped inside the SDK, before your logger is called, so
lower it too when your logger is set to `debug`. Values are matched exactly, in lowercase; an empty
`PROBEX_LOG_LEVEL` counts as unset, and an invalid value logs a warning and `warn` is used. See
[ADR 0015](../../adr/0015-filter-sdk-logs-by-level-before-the-apps-logger.md).

- `error` — ProbeX cannot do its job until something changes, such as a rejected token.
- `warn` — a problem ProbeX recovers from, or lost data, such as a reconnect or dropped snapshots.
- `info` — started, stopped, turned off.
- `debug` — details for diagnosing ProbeX itself.

```sh
PROBEX_LOG_LEVEL=debug node app.js
```

## Usage

Pass your app's logger. pino keeps the message and drops the context; to store the context as fields, pass it
first:

```ts
import pino from "pino";
import { probex, type Logger } from "@probex-platform/sdk";

const log = pino({ name: "probex" });
const logger: Logger = {
  debug: (message, context) => log.debug(context, message),
  info: (message, context) => log.info(context, message),
  warn: (message, context) => log.warn(context, message),
  error: (message, context) => log.error(context, message),
};

probex.configure({ logger, logLevel: "info" });
probex.run();
```

Any other logger takes the same four lines with its own methods.
