# 0010. Keep control messages apart from data messages

## Status

Accepted · 2026-10-21

## Context

The connector's buffer is bounded and drops messages when it is full. Most messages are data, such as snapshots,
and come in bursts from a breakpoint in a hot loop. A few are control messages, such as "breakpoint installed" or
"breakpoint failed", and are rare. Delivery is at most once (ADR 0007), so a dropped control message leaves the
hub wrong until the next reconnect. `Connector.send()` takes one message and nothing else.

## Decision

We keep two queues in `HubConnector`, chosen by message type: data messages go to the bounded data buffer and are
dropped oldest first, and all other messages go to a control queue of 100 that data never pushes out and that goes
first in every batch.

## Alternatives

- **One buffer that drops the oldest of any type** — a burst of snapshots drops breakpoint status messages exactly
  when the user is watching the hub.
- **A priority argument on `send()`** — changes the `Connector` interface every connector implements, and every
  caller has to choose a priority.

## Consequences

- A snapshot burst cannot hide a breakpoint's status from the hub.
- The connector keeps a list of data message types; a new message type is control unless it is added there.
- Control messages still count against the rate limit; dropping one, when 100 are waiting, is logged as an error.
