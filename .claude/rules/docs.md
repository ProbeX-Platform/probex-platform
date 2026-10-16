---
paths:
  - "docs/**"
  - "README.md"
---

# Docs

The reader is a developer integrating ProbeX, not us. Write for someone who has not seen the code.

- One `#` title per file, ≤ 60 chars. Sentence case.
- Use terms from `docs/glossary.md`; add new terms there instead of inventing synonyms.
- Link, do not repeat: point to the ADR for "why", to `docs/api/` for "how to use".
- Code blocks always declare a language. Relative links between docs.
- `docs/api/<package>.md`: per exported symbol: signature, parameters, return value, errors, minimal example.
- `docs/architecture/<component>.md` describes only the decided design: purpose, boundaries, what it talks to
  (Mermaid diagram), key flows, and links to the ADRs behind it.
  - No alternatives, no "we considered", no open questions. Undecided topics go to `/architect` first.
  - When a decision changes, update the doc to the new design; the history lives in the ADRs.

```md
<!-- Bad: discussion in an architecture doc -->

## Transport

We could use WebSocket or HTTP. WebSocket is probably better because...

<!-- Good -->

## Transport

The SDK opens one WebSocket to the connector and keeps it alive with heartbeats. See
[ADR 0003](../adr/0003-use-websocket-for-sdk-transport.md).
```
