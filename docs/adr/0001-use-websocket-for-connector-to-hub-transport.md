# 0001. Use WebSocket for connector to hub transport

## Status

Accepted · 2026-10-19

## Context

The connector runs inside customers' production apps and opens an outbound connection to the hub. Messages flow
both ways: breakpoint commands and `sync` from the hub, statuses and snapshots to it. Breakpoint changes should
reach the app at once. The transport must add almost no overhead to the host app and no heavy dependencies. The
protocol in `@probex/shared` is JSON. Every instance of a service connects on its own, so the hub holds many
long-lived connections.

## Decision

We use one WebSocket (`wss://`) per instance, opened by the connector to the hub, carrying JSON messages from
`@probex/shared`.

## Alternatives

- **gRPC bidirectional streaming** — puts `@grpc/grpc-js` and protobuf into every host app, moves the protocol from
  TypeScript types to `.proto` files with codegen, and needs a proxy for browsers. Its protobuf encoding runs in
  JavaScript and is usually no faster than native `JSON.stringify` for JS objects; it pays off only at sustained
  high throughput, which a rate-limited debugger does not produce.
- **Server-Sent Events down, HTTP POST up** — two channels to correlate and keep alive, HTTP headers on every
  snapshot, and a hand-written SSE parser because `EventSource` is still experimental in Node.js.

## Consequences

- No runtime dependency in the host app: the connector uses the global `WebSocket` of Node.js 22.
- One socket per instance, 2–14 bytes of framing per message, low latency both ways.
- Binary encoding can come later over the same transport with a protocol version bump.
- We write reconnects (exponential backoff with jitter) and heartbeats ourselves; the global `WebSocket` has
  neither built in.
- The hub needs a WebSocket server library; it does not run in the host app.
- Behavior behind corporate egress proxies has to be verified for the global `WebSocket`.
