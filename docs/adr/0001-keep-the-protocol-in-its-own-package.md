# 0001. Keep the protocol in its own package

## Status

Accepted · 2026-10-21

## Context

The SDK, connectors and the hub are separate programs that talk only through messages, so they must agree on the
message types, the protocol version and the `Connector` interface. The SDK depends on the default connector. Users
can replace that connector with their own. The hub runs outside the host app and must not need debugger runtime
code. Whatever holds these types is public API, and changes to it decide whether old and new peers still understand
each other.

## Decision

We keep the message types, `PROTOCOL_VERSION`, the `Connector` interface and the data types carried in messages in
`@probex/protocol`, a types-only package that every side depends on. It holds only what both ends of the wire must
agree on.

## Alternatives

- **Types in `@probex/connector`** — custom connectors and the hub would install the default WebSocket transport to
  get an interface, and the SDK would ship the default connector even when the user replaces it.
- **Types in `@probex/sdk`** — the connector needs the message types while the SDK depends on the connector, which
  is a cycle; the hub would install the debugger runtime, and every SDK release would look like a protocol change.
- **A general `@probex/shared` for anything two packages use** — helpers and internal types would pile up next to
  the protocol, every change would touch all packages, it would be unclear which changes break compatibility, and
  all of it would become public API.

## Consequences

- The dependency graph has no cycles: the SDK, connectors and the hub import `@probex/protocol` and never each other
  for protocol types.
- A protocol change is visible as a change to one small package and is checked against `PROTOCOL_VERSION`.
- Small helpers used by several packages are duplicated or kept in their owner instead of being shared here.
- One more package to version and publish.
- Follow-up: rename `packages/shared` (`@probex/shared`) to `packages/protocol` (`@probex/protocol`), with its
  dependents, `CLAUDE.md` and `.claude/rules/shared.md`.
