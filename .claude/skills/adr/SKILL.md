---
description: Write a new architecture decision record in docs/adr.
argument-hint: <decision title>
disable-model-invocation: true
---

Decision: $ARGUMENTS

1. Find the next number: highest `docs/adr/NNNN-*.md` + 1.
2. Copy `docs/adr/0000-template.md` to `docs/adr/NNNN-kebab-title.md`. The title is ≤ 60 chars and names the
   decision ("Use WebSocket for connector transport"), not the topic ("Transport").
3. Fill it from the conversation; follow `.claude/rules/adr.md`. Status `Proposed` with today's date unless the user
   already accepted it. If facts are missing, ask instead of inventing them.
4. Add a row to the index in `docs/adr/README.md`. If it supersedes an ADR, update that ADR's status line only.
5. Run `pnpm triage` and fix any `docs` check failures.
