# 0002. Ship the default connector inside the SDK

## Status

Accepted · 2026-10-21

## Context

The SDK needs a default transport to the hub, so every user of the SDK gets the default connector. Users who need
another transport implement the `Connector` interface from `@probex-platform/protocol` and do not need the default one. The
hub is the other end of the wire and needs only the protocol. The SDK and its default transport change together,
and the default connector needs no runtime dependencies: Node.js 22 has a built-in WebSocket client.

## Decision

We ship the default connector as a module of `@probex-platform/sdk` in `packages/sdk/src/connector/`, which imports only
`@probex/protocol` and Node built-ins.

## Alternatives

- **A separate `@probex-platform/connector` package that the SDK depends on** — every user installs it anyway, the two
  packages would always be released together, and it adds a package to version, publish and document without a
  consumer other than the SDK.
- **A separate package that users install and pass to the SDK** — the SDK would not work without extra installation
  and wiring, which goes against making ProbeX easy to adopt.

## Consequences

- One package to install; the SDK works with the hub out of the box.
- The default connector ships with the SDK even when a user replaces it; it has no dependencies, so the cost is a
  few kilobytes.
- A tool that needs the transport without the debugger has to wait until the connector moves to its own package;
  keeping it free of other SDK imports makes that move cheap.
