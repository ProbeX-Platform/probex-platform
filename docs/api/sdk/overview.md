# @probex-platform/sdk API

## Installation

```sh
pnpm add @probex-platform/sdk
```

Node.js 22 or later, with `import` or `require()`. For TypeScript, ship source maps; bundles are not supported.
What else the app needs: [`probex`](debugger.md#probex).

What your app can rely on:

- There is one [`probex`](debugger.md#probex) per process, shared by every copy of the SDK.
- No method throws; an internal error turns ProbeX off and the app keeps running. Capturing stops after 10 ms per
  pause and 20 ms per second; a snapshot is at most 64 KiB.
- ProbeX keeps the process alive only while `stop()` sends buffered snapshots, for up to 6 s by default, and
  briefly while it connects to the hub or closes a connection: [`HubConnector`](connector.md#hubconnector).
- Its problems go to `console` at `warn` and above, or to your [`Logger`](logger.md#logger).

## Exports

- [Debugger](debugger.md):
  - [`probex`](debugger.md#probex) — the debugger: `configure()`, `run()`, `stop()`.
  - [`Debugger`](debugger.md#debugger) — the type of `probex`.
  - [`DebuggerOptions`](debugger.md#debuggeroptions) — the options of `configure()`.
- [Connector](connector.md):
  - [`HubConnector`](connector.md#hubconnector) — the default transport to the hub. The SDK creates it and you tune
    it through `hubConnector`; create one yourself only to use it without the debugger.
  - [`HubConnectorOptions`](connector.md#hubconnectoroptions) — its options.
- [Logger](logger.md):
  - [`Logger`](logger.md#logger) — where the SDK writes its own problems; `console`, pino and winston fit.
  - [`LogContext`](logger.md#logcontext) — the structured fields of each line.
  - [`LogLevel`](logger.md#loglevel) — the lowest level written.

Protocol types, such as [`Connector`](../protocol.md#connector), come from
[`@probex-platform/protocol`](../protocol.md).

## Usage

Each option is resolved once, at `probex.run()`: the value passed to `configure()`, then the environment variable,
then the default. A `HubConnector` you create resolves its own in its constructor. With a custom `connector`, `url`,
`token`, `service` and `labels` are ignored.

| Variable           | Option     | Default                                                      |
| ------------------ | ---------- | ------------------------------------------------------------ |
| `PROBEX_ENABLED`   | `enabled`  | `true`                                                       |
| `PROBEX_HUB_URL`   | `url`      | none; required unless a `connector` is set                   |
| `PROBEX_TOKEN`     | `token`    | none                                                         |
| `PROBEX_SERVICE`   | `service`  | none                                                         |
| `PROBEX_LABELS`    | `labels`   | no labels; format `team=payments,region=eu`                  |
| `PROBEX_REDACT`    | `redact`   | built-in names only; format `iban,ssn`                       |
| `PROBEX_LOG_LEVEL` | `logLevel` | `warn`; exactly `debug`, `info`, `warn`, `error` or `silent` |

Set them in the deployment, call `probex.run()` as early as possible, and `probex.stop()` in your app's shutdown:
[debugger usage](debugger.md#usage).
