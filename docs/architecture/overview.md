# Architecture overview

## Components

```text
┌─────────────────────────── Host app ────────────────────────────┐
│ ┌──────────┐    messages    ┌──────────────┐                    │  hello, messages (wss)  ┌─────┐
│ │ Debugger │───────────────▶│ HubConnector │────────────────────┼────────────────────────▶│ Hub │
│ │          │◀───────────────│              │◀───────────────────┼─────────────────────────│     │
│ └──────────┘    messages    └──────────────┘                    │  welcome, breakpoints   └─────┘
└─────────────────────────────────────────────────────────────────┘
```

The [SDK](sdk/overview.md) runs inside the host app: its [debugger](sdk/debugger.md) talks to the hub only through
a [connector](sdk/connector.md), by default `HubConnector` over one WebSocket.

## Packages

- `@probex-platform/protocol` — messages, `PROTOCOL_VERSION` and the `Connector` interface:
  [architecture](protocol.md), [API](../api/protocol.md).
- `@probex-platform/sdk` — the debugger and `HubConnector`: [architecture](sdk/overview.md),
  [API](../api/sdk/overview.md).

## Key flows

- [Connecting to the hub](sdk/connector.md#connecting)
- [Opening a session](protocol.md#opening-a-session)

## Decisions

- [0001. Keep the protocol in its own package](../adr/0001-keep-the-protocol-in-its-own-package.md)
- [0002. Ship the default connector inside the SDK](../adr/0002-ship-the-default-connector-inside-the-sdk.md)
- [0003. Configure the connector from options, then env](../adr/0003-configure-the-connector-from-options-then-env.md)
- [0004. Use handler functions in the Connector interface](../adr/0004-use-handler-functions-in-the-connector-interface.md)
- [0005. Batch and rate-limit messages in the connector](../adr/0005-batch-and-rate-limit-messages-in-the-connector.md)
- [0006. Authenticate to the hub with a bearer token](../adr/0006-authenticate-to-the-hub-with-a-bearer-token.md)
- [0007. Deliver messages to the hub at most once](../adr/0007-deliver-messages-to-the-hub-at-most-once.md)
- [0008. Use WebSocket for the hub connection](../adr/0008-use-websocket-for-the-hub-connection.md)
- [0009. Run the hub handshake in the connector](../adr/0009-run-the-hub-handshake-in-the-connector.md)
