# @probex-platform/sdk debugger API

## Installation

Part of [`@probex-platform/sdk`](overview.md#installation).

## Exports

### `probex`

```ts
const probex: Debugger;
```

The debugger. It sets non-breaking breakpoints and captures snapshots, and talks to the hub through a connector.
There is one per process, shared by every import of the SDK, even when two copies of the package are installed.
Call `configure()` if you need to, then `run()` once at startup, and `stop()` on shutdown. It never keeps the
process alive.

The hub sets breakpoints by the file's path in your repository. For TypeScript, ship source maps: inline or as
`.map` files next to the JavaScript; bundled output is not supported. While breakpoints are set, the debugger
resumes every pause it did not cause, including `debugger` statements, so do not attach another debugger to the
process. When the process runs with `--inspect`, ProbeX does not start. Design: [debugger architecture](../../architecture/sdk/debugger.md).

**Methods**

- `configure(options?)` — sets [`DebuggerOptions`](#debuggeroptions) for the next `run()`. Each call merges its
  fields over the earlier ones: a field set by a later call replaces the earlier value whole, `labels` and
  `hubConnector` included. Optional: without it `run()` uses environment variables and defaults.
- `run()` — starts the debugger and returns at once: it resolves the options, opens an inspector session and
  connects to the hub in the background. Each option is resolved here, once: the value passed to `configure()`,
  then its environment variable, then the default (see
  [ADR 0003](../../adr/0003-configure-the-connector-from-options-then-env.md)). Changes to `process.env` take
  effect on the next `run()`.
- `stop()` — removes all breakpoints, closes the inspector session and closes the connector the debugger created,
  which sends buffered snapshots for up to `hubConnector.closeTimeoutMs`. Resolves when done; `run()` may be called
  again after it, with the options configured so far.

Calls in any order are safe:

| Call          | Not running        | Running                         | Stopping                 |
| ------------- | ------------------ | ------------------------------- | ------------------------ |
| `configure()` | merges the options | logs a warning, changes nothing | logs a warning           |
| `run()`       | starts             | does nothing                    | logs a warning           |
| `stop()`      | resolves at once   | stops                           | returns the same promise |

**Errors** — a failure in the debugger only turns the debugger off; your app keeps running and serving as if
ProbeX were not there. No method throws, `stop()` never rejects, nothing blocks the event loop, and every problem
is logged to the [`logger`](#debuggeroptions). After a failed `run()` the debugger is not running, so
`configure()` and `run()` can be called again.

- No `url` and no `connector`: `run()` logs an error and the debugger does not start.
- The inspector is already open, by `--inspect` or `inspector.open()`: `run()` logs a warning and the debugger
  does not start.
- The inspector session cannot be opened or anything else fails while starting: an error is logged, whatever was
  started is stopped, and the debugger does not start.
- An unexpected error inside the debugger while it runs: it is logged and the debugger stops itself, as if
  `stop()` had been called.
- An invalid option value, `PROBEX_ENABLED` or `PROBEX_LOG_LEVEL`: a warning is logged and the default is used.
  An empty or invalid `redact` entry is skipped with a warning; the built-in names always apply.
- The logger throws or returns a rejected promise: the error is ignored; the debugger keeps working.

```ts
import { probex } from "@probex-platform/sdk";

probex.run(); // hub URL, token and service from PROBEX_HUB_URL, PROBEX_TOKEN and PROBEX_SERVICE
```

### `Debugger`

```ts
interface Debugger {
  configure(options?: DebuggerOptions): void;
  run(): void;
  stop(): Promise<void>;
}
```

The type of [`probex`](#probex); its methods are described there.

```ts
import { probex, type Debugger } from "@probex-platform/sdk";

const debuggerForTests: Debugger = probex;
```

### `DebuggerOptions`

```ts
interface DebuggerOptions {
  enabled?: boolean;
  url?: string;
  token?: string;
  service?: string;
  labels?: Record<string, string>;
  redact?: string[];
  logger?: Logger;
  logLevel?: LogLevel;
  hubConnector?: Pick<HubConnectorOptions, "buffer" | "batch" | "rateLimit" | "reconnect" | "closeTimeoutMs">;
  connector?: Connector;
}
```

The options of [`probex.configure()`](#probex). Every field is optional.

**Parameters**

- `enabled` — `boolean`, env `PROBEX_ENABLED` as `true` or `false`. When `false`, `run()` logs one info line and
  does nothing, so a deployment can switch ProbeX off without a code change. Default `true`.
- `url`, `token`, `service`, `labels` — passed to the default connector, with the same environment variables,
  defaults and rules as in [`HubConnector`](connector.md#hubconnector).
- `redact` — `string[]`, env `PROBEX_REDACT` as names separated by commas, such as `iban,ssn,clientKey`. Names
  whose values are replaced with `redacted` in snapshots, added to the built-in ones (`password`, `secret`,
  `token`, `apikey`, `authorization`, `cookie`, `session` and more). Case, `_`, `-` and `.` are ignored, and a
  name matches every variable or property whose name contains it, at any depth. The built-in names cannot be
  removed. A passed array replaces the env value. Default: built-in names only. Rules:
  [redacting secrets](../../architecture/sdk/debugger.md#redacting-secrets),
  [ADR 0012](../../adr/0012-redact-secrets-by-name-inside-the-sdk.md).
- `logger` — [`Logger`](logger.md#logger), used by the debugger and by the default connector. Default: `console`.
- `logLevel` — [`LogLevel`](logger.md#loglevel), env `PROBEX_LOG_LEVEL`: the lowest level written, for the debugger
  and the default connector. Default `warn`. A `configure()` call before `run()` applies `logger` and `logLevel`
  first, so its own warnings use them.
- `hubConnector` — tuning of the default connector: buffer, batch, rate limit, reconnect delays and close timeout,
  as in [`HubConnectorOptions`](connector.md#hubconnectoroptions).
- `connector` — a custom [`Connector`](../protocol.md#connector) used instead of `HubConnector`. `run()` calls its
  `connect()`; the debugger never closes it, so close it yourself after `stop()` resolves. When it is set, `url`,
  `token`, `service`, `labels` and `hubConnector` passed to `configure()` are ignored with a warning.

```ts
import { probex } from "@probex-platform/sdk";

probex.configure({
  service: "checkout",
  labels: { region: "eu" },
  redact: ["iban", "ssn"],
  hubConnector: { batch: { flushIntervalMs: 250 } },
});
```

## Usage

Set `PROBEX_HUB_URL`, `PROBEX_TOKEN` and `PROBEX_SERVICE` in the deployment, then start the debugger as early as
possible and stop it on shutdown:

```ts
import pino from "pino";
import { probex } from "@probex-platform/sdk";

probex.configure({ logger: pino({ name: "probex" }), labels: { region: "eu" } });
probex.run();

process.once("SIGTERM", async () => {
  await probex.stop(); // sends buffered snapshots first
  process.exit(0);
});
```
