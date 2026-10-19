---
paths:
  - "docs/adr/**"
---

# ADRs

An ADR answers "why this and not that" for developers and companies using ProbeX. Write one only when there was a
real choice: at least two viable options and a decision that is costly to reverse. An obvious or easily reversible
choice goes straight into `docs/architecture/`.

- File `docs/adr/NNNN-kebab-title.md`, next free number, no gaps. Copy `docs/adr/0000-template.md` and keep its
  sections in order: Status, Context, Decision, Alternatives, Consequences.
- First heading `# NNNN. Title`; the title is ≤ 60 chars and names the decision, not the topic.
- Status line: `<status> · YYYY-MM-DD`, where status is `Proposed`, `Accepted`, `Deprecated` or
  `Superseded by [NNNN](NNNN-title.md)`.
- Context: the requirements and constraints that made the choice necessary.
- Decision: one or two sentences in active voice: "We use X for Y."
- Alternatives: every rejected option with the concrete reason it lost.
- Never rewrite an accepted ADR: write a new one and mark the old one superseded.

```md
<!-- Bad: topic as title, no alternatives -->

# 0003. Transport

We talked about transports and WebSockets seem good.

<!-- Good -->

# 0003. Use WebSocket for SDK to connector transport

## Decision

We use one WebSocket per SDK instance, opened by the SDK to the connector.

## Alternatives

- **HTTP polling** — breakpoint changes would reach the SDK only on the next poll; latency or load, never both low.
- **HTTP + Server-Sent Events** — two channels to keep in sync and SSE is one-way.
```
