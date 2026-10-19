# 0004. Represent snapshot variables as a nested tree

## Status

Accepted · 2026-10-19

## Context

A snapshot shows what a debugger shows at a pause: frames, scopes and variables. Unlike a live debugger, ProbeX
resumes at once, so the whole variable graph is captured up front within depth, size and time limits. Snapshots
are read by tools, AI agents and people looking at raw JSON. `@probex/shared` holds types only and cannot ship a
helper to decode them.

## Decision

We represent variables as a nested tree: each variable has a name, a type, an optional value preview and optional
children, with markers for truncated, circular and redacted values.

## Alternatives

- **Flat object table with references** (like DAP `variablesReference`) — captures each object once and is smaller
  when objects are shared, but every consumer must resolve references, and that logic cannot live in
  `@probex/shared`, so each consumer rewrites it.

## Consequences

- Consumers render or read a snapshot directly, with no helper.
- An object reachable twice is captured twice; depth and size limits keep the cost bounded.
- A cycle ends in a variable marked `circular`.
- Switching to references later is a breaking change and bumps the protocol version.
