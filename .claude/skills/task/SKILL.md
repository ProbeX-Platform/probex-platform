---
description: Discuss a piece of work and create a ready-to-implement card in the tracker's Backlog.
argument-hint: <topic>
disable-model-invocation: true
model: opus
effort: high
---

Topic: $ARGUMENTS

Goal: a card that `/do-task` or another developer can implement without coming back with questions.
This is a conversation, one step per reply. Do not implement anything.

1. **Understand.** Read the related code, docs and ADRs (use the Explore agent). Restate the topic in two sentences:
   who has which problem and what changes for them.
2. **Discuss.** Ask in rounds of at most 4 questions (AskUserQuestion, concrete options):
   - who needs it and why now;
   - expected behavior, including edge cases and what happens on failure;
   - constraints: overhead in the host app, public API or protocol compatibility, security;
   - what is explicitly out of scope.
3. **Draft and challenge.** Propose acceptance criteria and point out what is missing or untestable. Repeat 2–3
   until the user confirms nothing is missing.
4. **Architecture check.** An open design question (for example "WebSocket or HTTP?") → stop and suggest
   `/architect` first. The card then links the resulting doc or ADR.
5. **Create.** Show the card filled from `.claude/templates/card.md`. Once the user confirms, create it in the
   **Backlog** list of the tracker in `CLAUDE.md` and print its link. Never put a card anywhere but Backlog.
