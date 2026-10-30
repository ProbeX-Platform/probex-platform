# @probex-platform/sdk API

## Installation

```sh
pnpm add @probex-platform/sdk
```

- Node.js 22 or later. Works with `import` and `require()`. The main thread is debugged; worker threads are not.
- TypeScript: ship source maps, inline or as `.map` files next to the JavaScript. Bundled output is not supported.
- Do not attach another debugger to the process: while breakpoints are set, ProbeX resumes every pause it did not
  cause. With `--inspect`, ProbeX does not start.

## Exports

- [Debugger](debugger.md):
  - [`probex`](debugger.md#probex) — the debugger: `configure()`, `run()`, `stop()`.
  - [`Debugger`](debugger.md#debugger) — the type of `probex`.
  - [`DebuggerOptions`](debugger.md#debuggeroptions) — the options of `configure()`.
- [Connector](connector.md):
  - [`HubConnector`](connector.md#hubconnector) — the default transport to the hub; create it yourself only to tune
    it.
  - [`HubConnectorOptions`](connector.md#hubconnectoroptions) — its options.
- [Logger](logger.md):
  - [`Logger`](logger.md#logger) — where the SDK writes its own problems; `console`, pino and winston fit.
  - [`LogContext`](logger.md#logcontext) — the structured fields of each line.
  - [`LogLevel`](logger.md#loglevel) — the lowest level written.

Protocol types, such as [`Connector`](../protocol.md#connector), come from
[`@probex-platform/protocol`](../protocol.md).

## Usage

Each option is resolved once, at `run()`: the value passed to `configure()`, then the environment variable, then
the default.

| Variable           | Option     | Default                                                      |
| ------------------ | ---------- | ------------------------------------------------------------ |
| `PROBEX_ENABLED`   | `enabled`  | `true`                                                       |
| `PROBEX_HUB_URL`   | `url`      | none; required unless a `connector` is set                   |
| `PROBEX_TOKEN`     | `token`    | none                                                         |
| `PROBEX_SERVICE`   | `service`  | none                                                         |
| `PROBEX_LABELS`    | `labels`   | no labels; format `team=payments,region=eu`                  |
| `PROBEX_REDACT`    | `redact`   | built-in names only; format `iban,ssn`                       |
| `PROBEX_LOG_LEVEL` | `logLevel` | `warn`; exactly `debug`, `info`, `warn`, `error` or `silent` |

Set them in the deployment, then start the debugger as early as possible and stop it on shutdown:

```ts
import { probex } from "@probex-platform/sdk"; // or: const { probex } = require("@probex-platform/sdk");

probex.run();

process.once("SIGTERM", async () => {
  await probex.stop();
  process.exit(0);
});
```

Options and the rest of the lifecycle: [debugger API](debugger.md).
