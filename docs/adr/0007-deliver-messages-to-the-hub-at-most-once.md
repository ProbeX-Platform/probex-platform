# 0007. Deliver messages to the hub at most once

## Status

Accepted · 2026-10-21

## Context

The connector runs inside the host app, so its memory, CPU and I/O must stay small and bounded. Snapshots are
diagnostic data: one more hit of the same breakpoint usually replaces a lost one. Breakpoint state is owned by the
hub, which can send it again at any time. Connections to the hub drop, and the host app restarts.

## Decision

We deliver SDK messages at most once and keep them only in memory: messages wait in bounded queues while the hub
is unreachable, and messages lost with a dropped socket are not resent. After every connect, the hub sends the full
breakpoint state.

## Alternatives

- **Acknowledged delivery while the process lives** — message ids, acks, resends and duplicate handling on the
  hub, and unacked messages held in the host app's memory, for data that is usually replaced by the next hit.
- **Durable delivery through a disk spool** — disk I/O and files inside the host app, and messages that outlive
  the code version that produced them.

## Consequences

- The protocol needs no message ids or acks, and the hub no deduplication.
- A disconnect can lose snapshots and breakpoint status messages; users see a gap, not wrong data.
- The SDK never has to reconcile state: the hub's full breakpoint state after every connect replaces it.
- Follow-up: the hub sends the full breakpoint state after `welcome`, and the debugger applies it as a replacement.
