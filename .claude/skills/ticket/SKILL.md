---
description: Turn a raw idea into a ticket with problem, acceptance criteria and scope.
argument-hint: <raw idea>
disable-model-invocation: true
---

Idea: $ARGUMENTS

Rewrite the idea as a ticket. Read the relevant code or docs only if needed to make it concrete. Ask at most two
questions if the goal is unclear. Do not implement anything.

```md
## <type>: <title, ≤ 60 chars, Conventional Commits type>

### Problem

Who is affected and what hurts today. 1–3 sentences.

### Acceptance

- [ ] Observable, testable behavior. Each line becomes a test.
- [ ] ...

### Out of scope

- What this ticket deliberately does not do.

### Context

Links to code (`path:line`), ADRs, docs. Size estimate: S / M / L.
```

Print the ticket. If the user asks, create it as a Trello card (Trello tools) or a GitHub issue (`gh issue create`).
