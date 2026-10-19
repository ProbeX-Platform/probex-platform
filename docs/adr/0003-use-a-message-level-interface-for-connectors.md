# 0003. Use a message-level interface for connectors

## Status

Accepted · 2026-10-19

## Context

The SDK talks to the hub only through a `Connector` from `@probex/shared`. End users can replace the default
WebSocket connector with their own, for another transport or as a test double. The protocol will gain commands
over time, and every change to the interface breaks each custom connector. The connector must stay unaware of
breakpoint and snapshot content, which the SDK owns.

## Decision

We define the `Connector` as a message mover: it is started and stopped, sends messages, delivers incoming
messages and reports connection state; commands are message types in a typed union.

## Alternatives

- **Command-level interface** (one method per command, such as `onSetBreakpoint` and `sendSnapshot`) — reads
  well, but every new command adds a method, so each protocol addition breaks every custom connector.

## Consequences

- A new command is a new message type; the interface and existing connectors stay unchanged.
- A custom connector is small to write: it moves messages and reports state.
- The SDK dispatches incoming messages by `type` and must ignore types it does not know.
