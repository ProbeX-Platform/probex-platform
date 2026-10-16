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
- `docs/architecture/<component>.md`: purpose, boundaries, what it talks to (Mermaid diagram), related ADRs.

```md
<!-- Bad -->

## addBreakpoint

This function adds a breakpoint. It is very useful.

<!-- Good -->

## `addBreakpoint(location: Location): Promise<BreakpointId>`

Sets a non-breaking breakpoint. Rejects with `BreakpointError` when the location is not loaded yet.
```
