# 0005. Batch and rate-limit messages in the connector

## Status

Accepted · 2026-10-21

## Context

The debugger can produce bursts of messages, for example a breakpoint in a hot loop. One frame per message wastes
the network and loads the hub; one frame with thousands of messages stalls the socket and the hub. The host app's
network must not be saturated by ProbeX. Custom connectors use other transports, which frame messages their own
way.

## Decision

We batch in `HubConnector`: it sends a batch when it reaches `batch.maxMessages`, `batch.maxBytes` or
`batch.flushIntervalMs`, and paces batches with a token bucket of `rateLimit.bytesPerSecond`. `Connector.send()`
keeps taking one message.

## Alternatives

- **Batching in the SDK, with `Connector.send(messages)`** — every transport would be tied to array framing, and
  the rate limit would sit in the debugger, away from the network it protects.
- **No batching** — one frame per message, so bursts cost the most exactly when the host app is busiest.

## Consequences

- Frame count and outgoing bandwidth are bounded, whatever the debugger produces.
- A message waits up to `batch.flushIntervalMs` before it is sent.
- Custom connectors decide on batching themselves.
- Follow-up: an optional batch frame in `@probex-platform/protocol` (no `PROTOCOL_VERSION` bump), accepted by the
  hub alongside single messages.
