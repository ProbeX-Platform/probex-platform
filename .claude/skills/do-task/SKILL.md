---
description: Implement a tracker card end to end and open a PR to staging.
argument-hint: [card link]
disable-model-invocation: true
---

Card: $ARGUMENTS

Board and lists: the Tracker section of `CLAUDE.md`. Card format: `.claude/templates/card.md`.

## 1. Pick

- A link was given: take the card if it is in **Planned**, or in **In Progress** with your own
  `Started by Claude · branch <name>` comment and that branch exists locally (resume it).
- No link: take the top card of **Planned**. Planned is empty → stop.
- Anything else (someone else's In Progress, In Review, Done, Backlog) → stop and say why. Never move or edit those.

## 2. Clarify

Read the card, its comments, and the related code, docs and ADRs (Explore agent). List what blocks a confident
implementation: missing acceptance criteria, unclear behavior or failure cases, conflicts with docs or ADRs.
Ask them (AskUserQuestion). Post the answers as one card comment `Clarifications` (question → answer) before coding.
An open design question → stop and suggest `/architect`.

## 3. Start

1. `git switch staging && git pull --ff-only`, then `pnpm verify`. Red → stop and report; never build on red.
2. Create `<type>/<kebab-case>` from `staging`.
3. Move the card to **In Progress** and comment `Started by Claude · branch <name>`.

## 4. Plan

- **S** — ≤ 2 files, behavior is clear: go.
- **M** — several files, clear goal: a 3–6 line plan inline, then go.
- **L** — public API, protocol, new package or dependency, or ambiguity: write the plan and wait for approval.

## 5. Implement with tests

Follow `.claude/rules/`. Every acceptance line becomes at least one test.

## 6. Blast radius

Delegate to `impact`. Write a test for every item under "Tests required" (gaps in 3+ files → delegate to
`unit-tester` with the list). Update `docs/api/` when it says so. "ADR: needed" → ask the user whether it was a
real choice; if yes, stop and suggest `/architect`.

## 7. Verify and review

`pnpm verify` must be green. Delegate to `reviewer` (`model: sonnet` for size S, `opus` otherwise). Fix every
blocker and major, then re-run `pnpm verify`.

## 8. Hand over and ship

Hand over per the Workflow section of `CLAUDE.md`. On the user's OK:

1. Commit, `git push -u origin <branch>`.
2. `gh pr create --base staging`: title = commit subject; body = card link, what changed, how it was tested.
3. Print the PR link, move the card to **In Review** and comment the PR link. Never touch the card again.

## Rework

The user asks for changes on an open PR: switch to its branch, run steps 5–8, and on OK commit and push to the
same branch. Do not move the card.
