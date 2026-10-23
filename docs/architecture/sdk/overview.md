# SDK overview

## Components

```text
┌──────────────────────── @probex-platform/sdk ─────────────────────────┐
│ ┌──────────┐      send(message)      ┌──────────────┐                 │  WebSocket   ┌─────┐
│ │ Debugger │────────────────────────▶│ HubConnector │─────────────────┼─────────────▶│ Hub │
│ │          │◀────────────────────────│              │◀────────────────┼──────────────│     │
│ └──────────┘   onMessage, onStatus   └──────────────┘                 │   messages   └─────┘
└───────────────────────────────────────────────────────────────────────┘
```

- [Debugger](debugger.md) — manages breakpoints and captures snapshots.
- [Connector](connector.md) — `HubConnector`, the default transport to the hub; a custom
  [`Connector`](../../api/protocol.md#connector) can replace it.

## Packages

`@probex-platform/sdk` depends on `@probex-platform/protocol` and `ws`.

## Key flows

None yet.

## Decisions

- [0001. Keep the protocol in its own package](../../adr/0001-keep-the-protocol-in-its-own-package.md)
- [0002. Ship the default connector inside the SDK](../../adr/0002-ship-the-default-connector-inside-the-sdk.md)
- [0008. Use WebSocket for the hub connection](../../adr/0008-use-websocket-for-the-hub-connection.md)
