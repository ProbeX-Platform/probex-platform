---
paths:
  - "docs/**"
  - "README.md"
---

# Docs

The reader is a developer integrating ProbeX, not us. Write for someone who has not seen the code. Short beats
complete: a doc that takes more than a few minutes to read gets split.

- One `#` title per file, ≤ 60 chars. Sentence case.
- One name per concept, the same in code and docs.
- Link, do not repeat: point to the ADR for "why", to `docs/api/` for "how to use".
- Code blocks always declare a language. Relative links between docs.
- Keep each file's section structure below; write `None yet.` under a section that has no content.

## `docs/architecture/`

Only the decided design. No alternatives, no "we considered", no open questions: undecided topics go to
`/architect`. When a decision changes, rewrite the doc to the new design; the history lives in the ADRs. A draft
made from `.claude/templates/architecture.md` is input for `/architect` only and is never merged as a draft.

`overview.md` has the sections Components (Mermaid diagram), Packages, Key flows, Decisions (ADR links).
`<component>.md` has the sections Purpose, Boundaries, Interactions (Mermaid diagram), Key flows, Decisions.

## `docs/api/<package>.md`

Copy `.claude/templates/api.md`. Sections Installation, Exports and Usage. Under Exports, one `###` per exported
symbol: signature, parameters, return value, errors, minimal example. A renamed or removed export keeps a one-line
note with the new name until the next major version. Usage shows one end-to-end example of the common case.

```md
<!-- Bad: discussion in an architecture doc -->

## Transport

We could use WebSocket or HTTP. WebSocket is probably better because...

<!-- Good -->

## Transport

The SDK opens one WebSocket to the connector and keeps it alive with heartbeats. See
[ADR 0003](../adr/0003-use-websocket-for-sdk-transport.md).
```
