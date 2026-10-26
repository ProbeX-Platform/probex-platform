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

What your app can rely on:

- ProbeX never throws into, crashes or blocks your app. If something fails, ProbeX turns itself off.
- Without breakpoints your app runs as if ProbeX were not there. A pause lasts at most 10 ms, and at most 20 ms per
  second in total.
- Memory and network use are bounded: old data is dropped and outgoing traffic is rate-limited.

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

Start ProbeX as early as possible and stop it on shutdown:

```ts
import { probex } from "@probex-platform/sdk";

probex.run();

process.once("SIGTERM", async () => {
  await probex.stop(); // sends buffered snapshots first
  process.exit(0);
});
```

## Configuration

Every setting can come from an environment variable or from `probex.configure()` in code; code wins.

| Variable         | What it sets                                              | Default   |
| ---------------- | --------------------------------------------------------- | --------- |
| `PROBEX_ENABLED` | `false` turns ProbeX off without a code change            | `true`    |
| `PROBEX_HUB_URL` | the hub's `wss://` URL                                    | required  |
| `PROBEX_TOKEN`   | the token the hub authenticates your app by               | none      |
| `PROBEX_SERVICE` | the service name the hub targets breakpoints by           | none      |
| `PROBEX_LABELS`  | extra targeting labels, such as `team=payments,region=eu` | no labels |

Logger, buffers, batching, rate limits and the rest: [SDK API](docs/api/sdk/overview.md).

## Requirements

- Node.js 22 or later. The main thread is debugged; worker threads are not.
- TypeScript apps ship source maps, inline or as `.map` files next to the JavaScript. Bundled output is not
  supported.
- No other debugger attached to the process: while breakpoints are set, ProbeX resumes every pause it did not cause.

## Beyond the defaults

- **Another transport** — implement the `Connector` interface from `@probex-platform/protocol` and pass it to the
  SDK: [protocol API](docs/api/protocol.md#connector).
- **Your own hub** — speak the ProbeX protocol: [protocol API](docs/api/protocol.md).

## Documentation

- [API](docs/api/overview.md) — every package, option and message.
- [Architecture](docs/architecture/overview.md) — how ProbeX works inside.
- [Architecture decisions](docs/adr/) — why it works this way.
- [Vision](docs/vision.md) — goals and principles.

## Contributing

See the [development guide](docs/development.md).

## Security and license

Report vulnerabilities as described in [SECURITY.md](SECURITY.md). License: [MIT](LICENSE).
