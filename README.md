# ProbeX

Open-source runtime debugger for Node.js: set non-breaking breakpoints in a running application and get snapshots
of its state, without changing code or redeploying.

> Early development. The design and API below are decided, but the packages are not implemented or published yet,
> and the API may still change.

## How it works

```text
┌──────────────────── Your app (Node.js) ────────────────────┐
│ ┌────┐  set breakpoints  ┌──────────────────────┐          │  snapshots (outbound wss)  ┌─────┐
│ │ V8 │◀──────────────────│ @probex-platform/sdk │──────────┼───────────────────────────▶│ Hub │
│ │    │──────────────────▶│                      │◀─────────┼────────────────────────────│     │
│ └────┘ stack, variables  └──────────────────────┘          │  breakpoints               └─────┘
└────────────────────────────────────────────────────────────┘
```

1. You add `@probex-platform/sdk` to your app and start it at boot.
2. The SDK opens one outbound WebSocket to the ProbeX hub, so your app opens no ports.
3. The hub sends breakpoints by file and line in your repository, such as `src/orders/checkout.ts:42`.
4. When that line runs, the SDK records the call stack and variables and resumes your code at once.
5. The snapshot goes to the hub, where you read it.

The hub is not part of this repository yet; any server that speaks the [protocol](docs/api/protocol.md) can act as
one.

What your app can rely on:

- ProbeX never throws into or crashes your app. An internal error turns ProbeX off; a lost hub connection is
  retried.
- Without breakpoints your app runs as if ProbeX were not there. Capturing stops after 10 ms per pause and 20 ms per
  second in total.
- Memory and network use are bounded: old data is dropped and outgoing traffic is rate-limited.
- ProbeX never keeps your process alive, except while `stop()` sends buffered snapshots, up to 6 s by default.
- Values of variables named like secrets, such as `password`, `token` or `apiKey`, are shown as `redacted` in the
  snapshot and never leave your app. Add your own names with `PROBEX_REDACT`.
- ProbeX reports its own problems to `console` at `warn` and above, or to your logger.

Exact limits and rules: [SDK API](docs/api/sdk/overview.md).

## Quick start

```sh
pnpm add @probex-platform/sdk
```

Set where to send snapshots, in the deployment:

```sh
PROBEX_HUB_URL=wss://hub.example.com/probex
PROBEX_TOKEN=<your token>
PROBEX_SERVICE=checkout
```

Start ProbeX as early as possible and stop it as a step of your app's own shutdown:

```ts
import { createServer } from "node:http";
import { probex } from "@probex-platform/sdk";

probex.run();

const server = createServer((request, response) => response.end("ok")).listen(3000);

process.once("SIGTERM", () => {
  server.close(() => {
    // sends buffered snapshots for up to 6 s, then the process exits by itself
    void probex.stop();
  });
});
```

Leave those 6 s in your orchestrator's grace period: [debugger usage](docs/api/sdk/debugger.md#usage).

## Configuration

Each setting below comes from its environment variable or from `probex.configure()` in code, read once at
`probex.run()`; code wins.

| Variable           | What it sets                                              | Default                                |
| ------------------ | --------------------------------------------------------- | -------------------------------------- |
| `PROBEX_ENABLED`   | `false` turns ProbeX off without a code change            | `true`                                 |
| `PROBEX_HUB_URL`   | the hub's `wss://` URL, or `ws://` for local testing      | required unless you pass a `connector` |
| `PROBEX_TOKEN`     | the token the hub authenticates your app by               | none                                   |
| `PROBEX_SERVICE`   | the service name the hub targets breakpoints by           | none                                   |
| `PROBEX_LABELS`    | extra targeting labels, such as `team=payments,region=eu` | no labels                              |
| `PROBEX_REDACT`    | extra names to redact, such as `iban,ssn`                 | built-in names only                    |
| `PROBEX_LOG_LEVEL` | the lowest level ProbeX logs: `debug` to `silent`         | `warn`                                 |

Logger, buffers, batching, rate limits and the rest: [SDK API](docs/api/sdk/overview.md).

## Requirements

- Node.js 22 or later, with `import` or `require()`. The main thread is debugged; worker threads are not.
- TypeScript apps ship source maps, inline or as `.map` files next to the JavaScript. Bundled output is not
  supported.
- No other debugger attached to the process: while breakpoints are set, ProbeX resumes every pause it did not cause.
  With `--inspect`, ProbeX does not start.

## Beyond the defaults

- **Another transport** — implement the `Connector` interface from `@probex-platform/protocol` and pass it to the
  SDK: [protocol API](docs/api/protocol.md#connector).
- **Your own hub** — speak the ProbeX protocol: [protocol API](docs/api/protocol.md).

## Documentation

- [API](docs/api/overview.md) — every package, option and message.
- [Architecture](docs/architecture/overview.md) — how ProbeX works inside.
- [Architecture decisions](docs/adr/) — why it works this way.
- [Vision](docs/vision.md) — goals and principles.
- [Example](examples/node-basic/) — a minimal app to try ProbeX.

## Contributing

See the [development guide](docs/development.md).

## Security and license

Report vulnerabilities as described in [SECURITY.md](SECURITY.md). License: [MIT](LICENSE).
