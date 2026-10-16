---
description: Shape a raw idea into a ready-to-implement ticket through a discussion.
argument-hint: <raw idea>
disable-model-invocation: true
model: opus
effort: high
---

Idea: $ARGUMENTS

Goal: a ticket that `/task` or another developer can implement without coming back with questions.
This is a conversation, one step per reply. Do not implement anything.

1. **Understand.** Read the related code, docs and ADRs (use the Explore agent). Restate the idea in two sentences:
   who has which problem and what changes for them.
2. **Discuss.** Ask in rounds of at most 4 questions (AskUserQuestion, concrete options):
   - who needs it and why now;
   - expected behavior, including edge cases and what happens on failure;
   - constraints: overhead in the host app, protocol or public API compatibility, security;
   - what is explicitly out of scope.
3. **Draft and challenge.** Propose acceptance criteria and point out what is missing or untestable. Repeat 2–3
   until the user confirms nothing is missing.
4. **Architecture check.** If an open design question appears (for example "WebSocket or HTTP?"), stop and suggest
   running `/architect` first. The ticket then links the resulting ADR or architecture doc.
5. **Write the ticket:**

```md
## <type>: <title, ≤ 60 chars>

### Problem

Who is affected, what hurts today, why it matters now. 2–5 sentences.

### Proposed behavior

How it works from the user's point of view, including failure cases.

### Acceptance

- [ ] Observable, testable behavior. Each line becomes at least one test.
- [ ] ...

### Out of scope

- What this ticket deliberately does not do, and where it goes instead.

### Technical context

- Affected packages and files (`path:line`), related ADRs and docs.
- Protocol or public API impact; risks and open technical points (not design questions).

### Size

S / M / L — one line why.
```

6. **Publish** only if the user asks: a Trello card (Trello tools) or a GitHub issue (`gh issue create`).
