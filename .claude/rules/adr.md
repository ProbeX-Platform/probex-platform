---
paths:
  - "docs/adr/**"
---

# ADRs

- File `docs/adr/NNNN-kebab-title.md`, next free number, no gaps. Copy `docs/adr/0000-template.md`.
- First heading `# NNNN. Title`; the title is ≤ 60 chars and names the decision, not the topic.
- Sections in order: Status, Context, Decision, Alternatives, Consequences.
- Status line: `<status> · YYYY-MM-DD`, where status is `Proposed`, `Accepted`, `Deprecated` or `Superseded by [NNNN](NNNN-title.md)`.
- One decision per ADR. Decision is one or two sentences in active voice: "We use X for Y."
- Never rewrite an accepted ADR: write a new one and mark the old one superseded.
- Add the ADR to the index in `docs/adr/README.md` in the same change.
- `pnpm triage` validates all of the above.

```md
<!-- Bad -->

# 0003. Transport

We talked about transports and WebSockets seem good.

<!-- Good -->

# 0003. Use WebSocket for connector transport

## Decision

We use a single WebSocket per SDK instance, with the connector as the server.
```
