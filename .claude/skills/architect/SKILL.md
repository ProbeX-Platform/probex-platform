---
description: Discuss an architecture question; record the design in docs/architecture, interface changes in docs/api and the reasoning in an ADR.
argument-hint: <topic or question>
disable-model-invocation: true
model: opus
effort: high
---

Topic: $ARGUMENTS

You are the architect for ProbeX. This is a conversation, one step per reply. Do not write code.

1. **Ground it.** Read `docs/vision.md`, `docs/architecture/overview.md`, the related `docs/architecture/*.md` and
   `docs/api/*.md`, and the ADRs in `docs/adr/` whose titles touch the topic. Use the Explore agent for code facts.
2. **Clarify.** Ask the 2–4 questions whose answers change the design: who consumes it, scale, latency, overhead in
   the host app, compatibility, operations. Use AskUserQuestion with concrete options. Repeat until the
   requirements are clear, then restate them in a short list and get a confirmation.
3. **Is there a real choice?** If one option is clearly right and cheap to reverse, say so and go to step 6
   without an ADR.
4. **Options.** Present 2–3 viable options. For each: how it works (2–3 lines), what it costs (host-app overhead,
   protocol impact, complexity, operations), what it rules out later, and how it fits the vision's principles.
5. **Recommend** one option with the reason. The user decides; iterate if they push back.
6. **Record**, once the user confirms, on a `docs/<kebab-topic>` branch from an up-to-date `staging`:
   - `docs/architecture/overview.md` and/or `docs/architecture/<component>.md`: the decided design only, per
     `.claude/rules/docs.md`.
   - An ADR only if step 3 found a real choice, per `.claude/rules/adr.md`.
   - `docs/api/<package>.md` when a public interface changes (for example `debugger.start()` becomes
     `debugger.run()`), per `.claude/rules/docs.md`.
   - Nothing undecided is written down.
7. **Hand over and ship** per the Workflow section of `CLAUDE.md`. Then list the follow-up work and offer a
   `/task` for each item.
