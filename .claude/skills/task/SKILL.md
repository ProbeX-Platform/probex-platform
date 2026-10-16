---
description: Take a ticket from text or link to a verified, ready-to-commit change.
argument-hint: <ticket text or link>
disable-model-invocation: true
---

Ticket: $ARGUMENTS

If the ticket is a link, read it first (Trello via the Trello tools, GitHub via `gh`). If it has no acceptance
criteria, write them down and confirm with the user before coding.

## 1. Size it

- **S** — ≤ 2 files, behavior is clear: do it.
- **M** — several files, clear goal: write a 3–6 line plan inline, then do it.
- **L** — architecture, ambiguity, protocol or public API change, new package or dependency: write a plan
  and STOP for approval. Suggest `/architect` if the design itself is open.

## 2. Branch

If on `main`/`staging`, create `<type>/<kebab-case>` (≤ 50 chars) from an up-to-date `main`.

## 3. Implement with tests

Every acceptance criterion becomes a test. Follow `.claude/rules/`.

## 4. Triage

Run `pnpm triage --json` and act on every action:

| action                 | do                                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| `none`                 | go to step 5                                                                                       |
| `fix-checks`           | fix, re-run triage                                                                                 |
| `write-tests`          | write the missing tests yourself, re-run triage                                                    |
| `delegate-unit-tester` | delegate to `unit-tester` with the gap files and acceptance criteria                               |
| `adr`                  | ask the user whether there was a real design choice; if yes, stop and suggest `/architect <topic>` |
| `docs`                 | update `docs/api/` for the changed exports                                                         |
| `e2e`                  | tell the user which flow is affected; there is no e2e suite yet                                    |
| `review`               | delegate to `reviewer`, fix blockers and majors, re-run triage                                     |

If there is no `review` action, run `/simplify` on the diff instead.

## 5. Hand over

Do not commit or push unless the user asked. Report in 3–5 lines: what changed, which checks passed, coverage of
changed files, and anything left for the user (ADR decision, e2e, follow-ups). End with a proposed commit message
(Conventional Commits, subject ≤ 72 chars) in a code block.
