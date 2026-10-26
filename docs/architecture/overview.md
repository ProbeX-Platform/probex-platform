# Architecture overview

## Components

```text
┌──────────────────────────────── Host app (Node.js) ────────────────────────────────┐
│                              ┌────────────── @probex-platform/sdk ───────────────┐ │
│ ┌────┐ Debugger.*, Runtime.* │ ┌──────────┐    send(message)    ┌──────────────┐ │ │  hello, messages (wss)   ┌─────┐
│ │ V8 │◀──────────────────────┼─│ Debugger │────────────────────▶│ HubConnector │─┼─┼─────────────────────────▶│ Hub │
│ │    │───────────────────────┼▶│          │◀────────────────────│              │◀┼─┼──────────────────────────│     │
│ └────┘  scriptParsed, paused │ └──────────┘ onMessage, onStatus └──────────────┘ │ │  welcome, breakpoints    └─────┘
│                              └───────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────┘
```

ProbeX debugs a running Node.js app without stopping it. The [SDK](sdk/overview.md) runs inside the host app: its
[debugger](sdk/debugger.md) sets breakpoints through the V8 inspector and captures snapshots of variables, and its
[connector](sdk/connector.md), `HubConnector` by default, carries messages to and from the hub over one WebSocket.
The hub decides which breakpoints exist and receives the snapshots. Every peer builds against the
[protocol](protocol.md).

What the host app can rely on:

- The SDK never throws into, crashes or blocks the app. A failure turns ProbeX off; the app keeps running.
- Without breakpoints V8 runs the app as if ProbeX were not there. A pause lasts at most 10 ms, and at most 20 ms
  per second in total.
- Memory and traffic are bounded: buffers drop the oldest data, and outgoing bytes are rate-limited.
- Values of variables named like secrets, such as `password` or `token`, are redacted inside the app; the hub cannot
  turn this off.

## Packages

- `@probex-platform/protocol` — messages, `PROTOCOL_VERSION` and the `Connector` interface; types and constants
  only. The SDK, custom connectors and hubs import it: [architecture](protocol.md), [API](../api/protocol.md).
- `@probex-platform/sdk` — the debugger and `HubConnector`, run in the host app. Depends on the protocol and `ws`:
  [architecture](sdk/overview.md), [API](../api/sdk/overview.md).
- `@probex-platform/configs` — shared TypeScript, ESLint, Prettier and Vitest presets; dev-time only, never in the
  host app: [architecture](configs.md), [API](../api/configs.md).

The protocol and the SDK ship as ES modules and CommonJS, so apps load them with `import` or `require()`.

## Key flows

One debugging session, end to end:

1. [Starting](sdk/debugger.md#starting) — `probex.run()` resolves the options and creates the connector.
2. [Connecting](sdk/connector.md#connecting) — the connector opens the WebSocket and
   [opens a session](protocol.md#opening-a-session) with `hello` → `welcome`.
3. [Applying breakpoints](sdk/debugger.md#applying-breakpoints) — the hub sends the full breakpoint set; the
   debugger maps repository lines to loaded scripts and reports each breakpoint's status.
4. [Capturing a snapshot](sdk/debugger.md#capturing-a-snapshot) — a hit pauses the thread briefly, the variables
   are read within limits, [secrets are redacted](sdk/debugger.md#redacting-secrets) and the snapshot goes to the
   connector.
5. [Sending a message](sdk/connector.md#sending-a-message) — control messages first, snapshots buffered, batched
   and rate-limited.
6. [Losing the connection](sdk/debugger.md#losing-the-connection) — breakpoints stay set; after the reconnect the
   hub sends the full set again.
7. [Stopping](sdk/debugger.md#stopping) — `probex.stop()` removes the breakpoints and flushes the connector.

Changing the contract between peers: [changing the protocol](protocol.md#changing-the-protocol).

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
- [0010. Send the full breakpoint set on every change](../adr/0010-send-the-full-breakpoint-set-on-every-change.md)
- [0011. Encode snapshot values as a nested tree](../adr/0011-encode-snapshot-values-as-a-nested-tree.md)
- [0012. Redact secrets by name inside the SDK](../adr/0012-redact-secrets-by-name-inside-the-sdk.md)
- [0013. Publish the packages as ES modules and CommonJS](../adr/0013-publish-the-packages-as-es-modules-and-commonjs.md)
