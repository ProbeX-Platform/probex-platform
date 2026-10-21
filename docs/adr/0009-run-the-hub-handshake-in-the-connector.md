# 0009. Run the hub handshake in the connector

## Status

Accepted · 2026-10-21

## Context

On every connection the hub needs to know which app instance it talks to and whether both sides speak the same
protocol version before it handles other messages. Its first frame must therefore be the handshake, even when
messages queued while the hub was unreachable are waiting. The `Connector` interface takes messages one by one and
has no way to send a message ahead of its queue. The hub targets breakpoints by service and labels.

## Decision

We run the handshake in `HubConnector`: after every connect it sends `hello` as the first frame, with protocol
version, service, labels and instance details, and reports `connected` and sends queued messages only after the
hub replies `welcome`.

## Alternatives

- **The debugger sends `hello` when the status becomes `connected`** — queued messages could reach the hub before
  `hello`, unless `Connector` gains a way to send a message first, which changes a public interface every
  connector implements.
- **Identity in the upgrade request's headers or URL** — labels do not fit headers well, and the version check
  would still need a reply from the hub.

## Consequences

- `connected` means the hub has accepted the session, not just that a socket is open.
- Service and labels are connector options with `PROBEX_SERVICE` and `PROBEX_LABELS`; both are public API.
- A custom connector that talks to a ProbeX hub implements the same handshake, described in the protocol API.
- An incompatible hub closes the connection with a close code; the connector logs an error and keeps retrying.
