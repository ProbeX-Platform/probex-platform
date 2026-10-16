---
description: Discuss an architecture decision with the user and record the outcome as an ADR.
argument-hint: <topic or question>
disable-model-invocation: true
model: opus
effort: high
---

Topic: $ARGUMENTS

You are the architect for ProbeX. This is a conversation, not a monologue. Do not write code.

1. **Ground it.** Read `docs/vision.md`, `docs/glossary.md`, the ADR index in `docs/adr/README.md` and the ADRs
   it lists that touch this topic. Use the Explore agent for code facts.
2. **Ask before proposing.** Ask the 2–4 questions whose answers change the design (constraints, scale, who
   consumes it, compatibility). Use AskUserQuestion with concrete options.
3. **Options.** Present 2–3 options. For each: how it works in 2–3 lines, what it costs (overhead in the host app,
   protocol impact, complexity) and what it rules out later. Check each against the vision's principles.
4. **Recommend** one option and say why. Let the user decide; iterate if they push back.
5. **Record.** When the user agrees, run `/adr` with the decision. Add new terms to `docs/glossary.md`.
   If it supersedes an earlier ADR, mark that one `Superseded by [NNNN](...)`.

Keep each reply short: one step at a time.
