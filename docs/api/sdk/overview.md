# @probex-platform/sdk API

## Installation

```sh
pnpm add @probex-platform/sdk
```

Requires Node.js 22 or later.

## Exports

- [Debugger](debugger.md) — [`probex`](debugger.md#probex), the debugger, and its options.
- [Connector](connector.md) — [`HubConnector`](connector.md#hubconnector), the default transport to the hub.

## Usage

Set `PROBEX_HUB_URL`, `PROBEX_TOKEN` and `PROBEX_SERVICE` in the deployment, then:

```ts
import { probex } from "@probex-platform/sdk";

probex.run();

process.once("SIGTERM", async () => {
  await probex.stop();
  process.exit(0);
});
```

Options and the rest of the lifecycle: [debugger API](debugger.md).
