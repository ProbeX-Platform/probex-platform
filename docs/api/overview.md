# ProbeX API

## Packages

| Package                     | Install it to                                            | API                     |
| --------------------------- | -------------------------------------------------------- | ----------------------- |
| `@probex-platform/sdk`      | debug a Node.js app: the debugger and its hub connector  | [SDK](sdk/overview.md)  |
| `@probex-platform/protocol` | write a custom connector or hub: messages and interfaces | [protocol](protocol.md) |
| `@probex-platform/configs`  | share TypeScript, ESLint, Prettier and Vitest presets    | [configs](configs.md)   |

How the packages fit together: [architecture overview](../architecture/overview.md).

## Usage

- **Debug an app** — install `@probex-platform/sdk`, set `PROBEX_HUB_URL`, `PROBEX_TOKEN` and `PROBEX_SERVICE`,
  and call `probex.run()` at startup: [SDK usage](sdk/overview.md#usage).
- **Use another transport** — implement [`Connector`](protocol.md#connector) and pass it to the SDK as
  [`connector`](sdk/debugger.md#debuggeroptions).
- **Write a hub** — answer [`hello`](protocol.md#hello) with [`welcome`](protocol.md#welcome), send
  [`breakpoints`](protocol.md#breakpoints), and receive [`batch`](protocol.md#batch), [`snapshot`](protocol.md#snapshot)
  and [`breakpointStatus`](protocol.md#breakpointstatus) messages.

No ProbeX export throws into your app: problems are logged, an internal error turns ProbeX off and a lost hub
connection is retried. Protocol changes are
backward-compatible or bump [`PROTOCOL_VERSION`](protocol.md#protocol_version).
