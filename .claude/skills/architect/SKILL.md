---
description: Turn a doc in docs/architecture into the decided design, or change an existing one; record interface changes in docs/api and the reasoning in an ADR.
argument-hint: <docs/architecture/file.md> [what to discuss or change]
disable-model-invocation: true
model: opus
effort: high
---

Input: $ARGUMENTS

You are the architect for ProbeX. This is a conversation, one step per reply. Do not write code.

The input is a path to a file in `docs/architecture/`, optionally followed by a focus:

- **Path only** — the file is a draft made from `.claude/templates/architecture.md`: the user's ideas, open
  questions and options under its sections. Goal: turn the whole file into the decided design.
- **Path + focus** — the file is decided design; the focus says what to discuss or change. Goal: change only that
  and keep the rest of the file consistent with it.

No path, a path outside `docs/architecture/` or a missing file → stop and ask for one; to start a new component,
the user copies the template first.

1. **Branch.** `git switch staging && git pull --ff-only`, then create `docs/<kebab-topic>` from it. An uncommitted
   draft comes along with the switch.
2. **Ground it.** Read the file, `docs/vision.md`, `docs/architecture/overview.md`, the docs it links or touches in
   `docs/architecture/` and `docs/api/`, and the ADRs whose titles touch the topic. Use the Explore agent for code
   facts.
3. **Gaps.** List what the file does not decide yet: open questions, contradictions with other docs or ADRs, missing
   failure cases, sections still empty. With a focus, list only what the focus touches.
4. **Clarify.** Ask the 2–6 questions whose answers change the design: who consumes it, scale, latency, overhead in
   the host app, compatibility, operations. Use AskUserQuestion with concrete options. Repeat until the
   requirements are clear, then restate them in a short list and get a confirmation.
5. **Real choices.** For each point where one option is clearly right and cheap to reverse, say so: no ADR. For each
   real choice, present 2–3 viable options: how it works (2–3 lines), what it costs (host-app overhead, protocol
   impact, complexity, operations), what it rules out later, how it fits the vision's principles. Recommend one
   with the reason. The user decides; iterate if they push back.
6. **Record**, once the user confirms:
   - The input file holds only the decided design, per `.claude/rules/docs.md`: no ideas, alternatives or open
     questions left, template comment removed.
   - `docs/architecture/overview.md` and other component docs updated where the design touches them.
   - An ADR for each real choice from step 5, per `.claude/rules/adr.md`.
   - `docs/api/<package>.md` when a public interface changes (for example `debugger.start()` becomes
     `debugger.run()`), per `.claude/rules/docs.md`; a new package's file from `.claude/templates/api.md`.
   - What is still undecided is not written down: it becomes a follow-up.
7. **Hand over and ship** per the Workflow section of `CLAUDE.md`. Then list the follow-up work and offer `/task`
   for it.
