# SDK overview

## Components

```text
┌───────────────────────────── @probex-platform/sdk ──────────────────────────────┐
│ ┌───────── Debugger ─────────┐    send(message)    ┌────── HubConnector ──────┐ │  hello, messages (wss)   ┌─────┐
│ │ Breakpoints · SourceMaps   │────────────────────▶│ session · control queue  │─┼─────────────────────────▶│ Hub │
│ │ RateLimiter · Capture      │◀────────────────────│ data buffer · batcher    │◀┼──────────────────────────│     │
│ │ InspectorSession           │ onMessage, onStatus │ rate limit · reconnect   │ │  welcome, breakpoints    └─────┘
│ └────────────────────────────┘                     └──────────────────────────┘ │
│     │                       ▲                                                   │
└─────┼───────────────────────┼───────────────────────────────────────────────────┘
      │ Debugger.*, Runtime.* │ scriptParsed, paused
      ▼                       │
  ┌───────────────────────────┴─────┐
  │ V8 (node:inspector)             │
  └─────────────────────────────────┘
```

- [Debugger](debugger.md) — the [`probex`](../../api/sdk/debugger.md#probex) object. Turns the hub's breakpoint
  list into V8 breakpoints through an in-process inspector session and captures snapshots within strict time, size
  and rate limits, with secrets redacted by name.
- [Connector](connector.md) — `HubConnector`, the default transport: the `hello` → `welcome` handshake, queues,
  batching, the rate limit and reconnects. A custom [`Connector`](../../api/protocol.md#connector) can replace it;
  the debugger sees only that interface.

Both follow the same rules for the host app: no method throws or blocks, every timer and socket is unref'd, memory
is bounded, and problems go to the configured [`Logger`](../../api/sdk/connector.md#logger).

## Packages

`@probex-platform/sdk` depends on `@probex-platform/protocol` and `ws` only. The parts live in
`packages/sdk/src/debugger/` and `packages/sdk/src/connector/`; the connector imports no other SDK module, so it can
move to its own package.

The package is built twice, as ES modules to `dist/esm/` and as CommonJS to `dist/cjs/`, and its `exports` map
picks one for `import` or `require()`; see [ADR 0013](../../adr/0013-publish-the-packages-as-es-modules-and-commonjs.md). Both builds share one
debugger per process, so an app that loads both still has one `probex`. Source files have no top-level `await`.

## Key flows

- [Starting the debugger](debugger.md#starting)
- [Connecting to the hub](connector.md#connecting)
- [Applying breakpoints](debugger.md#applying-breakpoints)
- [Capturing a snapshot](debugger.md#capturing-a-snapshot)
- [Sending a message](connector.md#sending-a-message)
- [Losing the connection](debugger.md#losing-the-connection)
- [Stopping the debugger](debugger.md#stopping)

## Decisions

- [0001. Keep the protocol in its own package](../../adr/0001-keep-the-protocol-in-its-own-package.md)
- [0002. Ship the default connector inside the SDK](../../adr/0002-ship-the-default-connector-inside-the-sdk.md)
- [0003. Configure the connector from options, then env](../../adr/0003-configure-the-connector-from-options-then-env.md)
- [0008. Use WebSocket for the hub connection](../../adr/0008-use-websocket-for-the-hub-connection.md)
- [0013. Publish the packages as ES modules and CommonJS](../../adr/0013-publish-the-packages-as-es-modules-and-commonjs.md)

Decisions of one component: [debugger](debugger.md#decisions), [connector](connector.md#decisions).
