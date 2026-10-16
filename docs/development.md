# Development guide

How the repository is organized, which checks protect it and how to work in it, with or without Claude Code.
Every script, hook and config is described in detail in the [tooling reference](tooling.md).

## Project structure

```text
probex/
├── packages/
│   ├── configs/            shared tsconfig, ESLint, Prettier and Vitest presets
│   ├── sdk/                debugger core, runs inside the host app (node:inspector)
│   └── connector/          transport between the SDK and clients
├── examples/node-basic/    demo app that embeds the SDK
├── docs/
│   ├── vision.md           goals and principles
│   ├── development.md      this file
│   ├── tooling.md          what every script, hook and config does
│   ├── glossary.md         one name per concept
│   ├── adr/                architecture decision records + template + index
│   ├── architecture/       component design
│   └── api/                public API reference
├── scripts/                repo tooling used by humans, CI and Claude Code
│   ├── triage.ts           `pnpm triage`: what changed, what is affected, is it safe
│   ├── check-names.ts      CI: branch name and PR title rules
│   └── lib/                shared modules (git, naming, docs checks, workspace graph)
├── .claude/                Claude Code setup (see below)
├── .github/                CI, dependency review, CODEOWNERS
└── CLAUDE.md               instructions Claude Code reads in every session
```

Dependency direction: `configs` ← everything; `sdk` and `connector` → `protocol` (planned); `examples` → `sdk`.
Packages import each other by package name only.

## Commands

| Command                          | What it does                                                          |
| -------------------------------- | --------------------------------------------------------------------- |
| `pnpm verify`                    | full gate on the whole repo: lint, format check, typecheck, tests     |
| `pnpm verify:fix`                | auto-fix lint and formatting                                          |
| `pnpm triage`                    | checks only what changed since `main`, plus coverage and next actions |
| `pnpm triage --json`             | the same as JSON                                                      |
| `pnpm build`                     | build all packages to `dist/`                                         |
| `pnpm --filter @probex/sdk test` | tests of one package                                                  |

### Reading `pnpm triage`

```text
triage: code · 5 files · 120 lines · base be4f83d      kind of change, size, merge-base with main
packages: @probex/sdk → affected: @probex/sdk, ...      changed packages and everything depending on them
touches: publicApi                                       sensitive areas hit by the change
checks: ✓ format  ✓ names  ✓ docs  ✓ lint  ✓ types  ✓ tests
✗ coverage packages/sdk/src/foo.ts 40% < 85%             changed files below the coverage threshold
actions: write-tests, review                             what to do next
```

- **kind**: `docs-only` runs only format, naming and docs checks; `config` and `code` run everything.
- **coverage**: line coverage of each changed file in `packages/*/src`, from the tests related to the change.
  Threshold 85%, 90% for `packages/protocol` and `packages/sdk/src/core`.
- **exit code**: 1 when a check is red or coverage has a gap, otherwise 0.

| Action                 | Meaning                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| `none`                 | nothing to do                                                                    |
| `fix-checks`           | a check is red                                                                   |
| `write-tests`          | coverage gap in 1–2 files                                                        |
| `delegate-unit-tester` | gap in 3+ files or a new untested module                                         |
| `review`               | diff over 300 lines or public API changed: get a careful review                  |
| `adr`                  | new package, runtime dependency, protocol or public API change without a new ADR |
| `docs`                 | public API changed but `docs/api/` did not                                       |
| `e2e`                  | protocol, transport or public API changed (no e2e suite yet)                     |

## Conventions

| What                | Rule                                                               | Enforced by     |
| ------------------- | ------------------------------------------------------------------ | --------------- |
| Branch              | `<type>/<kebab-case>`, ≤ 50 chars, e.g. `feat/breakpoint-snapshot` | Claude hook, CI |
| Commit and PR title | Conventional Commits, ≤ 72 chars, e.g. `fix(sdk): ...`             | triage, CI      |
| Doc and ADR title   | ≤ 60 chars                                                         | triage          |
| ADR                 | `docs/adr/NNNN-kebab-title.md` from the template, indexed          | triage          |
| Merging             | PR only, 1 code-owner approval, squash merge, signed commits       | GitHub ruleset  |

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `revert`.
PRs are squash-merged, so the PR title becomes the commit on `main`.

## Where checks run

| Check                          | While editing (Claude) | Before finishing (Claude) | `pnpm triage` | CI  |
| ------------------------------ | :--------------------: | :-----------------------: | :-----------: | :-: |
| Prettier, ESLint on the file   |           ✓            |                           |               |     |
| Branch name, no commit to main |           ✓            |                           |       ✓       |  ✓  |
| Lint, format, types, tests     |                        |             ✓             |       ✓       |  ✓  |
| Diff coverage, ADR/doc checks  |                        |             ✓             |       ✓       |     |
| Dependency review              |                        |                           |               |  ✓  |

## Claude Code setup

Everything Claude-specific lives in `.claude/` and `CLAUDE.md`. Model choice is personal: set it in your own
`~/.claude/settings.json` (recommended `"model": "opusplan"`), never in the project settings.

| Part              | Files                         | Loaded                       | Role                                                   |
| ----------------- | ----------------------------- | ---------------------------- | ------------------------------------------------------ |
| Project memory    | `CLAUDE.md`                   | every session                | what ProbeX is, commands, workflow, hard rules         |
| Rules             | `.claude/rules/*.md`          | only for matching files      | coding, testing, SDK, protocol, ADR and docs standards |
| Skills            | `.claude/skills/*/SKILL.md`   | when you type `/name`        | repeatable workflows                                   |
| Agents            | `.claude/agents/*.md`         | when delegated               | separate context and a cheaper or stronger model       |
| Hooks             | `.claude/hooks/*.ts`          | automatically on events      | deterministic checks, 0 tokens when green              |
| Settings          | `.claude/settings.json`       | every session                | hooks and permissions                                  |
| Personal settings | `.claude/settings.local.json` | every session, not committed | your own allow/deny rules                              |

### Skills (you start them)

| Command              | Use it for                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `/ticket <idea>`     | discuss a raw idea until it is a ready ticket with acceptance criteria and context        |
| `/architect <topic>` | discuss an open design question; writes the design doc and, if there was a choice, an ADR |
| `/task <ticket>`     | any ticket: size it, plan, implement with tests, triage, hand over a commit message       |

### Agents (Claude delegates to them)

| Agent         | Model, effort  | When                               | Can edit |
| ------------- | -------------- | ---------------------------------- | :------: |
| `Explore`     | haiku, low     | any code search                    |    no    |
| `unit-tester` | sonnet, medium | triage says `delegate-unit-tester` |  tests   |
| `reviewer`    | opus, high     | triage says `review`               |    no    |

### Hooks (run by themselves)

| Hook             | Event                  | Does                                                                 |
| ---------------- | ---------------------- | -------------------------------------------------------------------- |
| `format-file.ts` | after Edit/Write       | Prettier + `eslint --fix` on that file; reports leftover errors      |
| `guard-git.ts`   | before Bash            | blocks bad branch names, commits on `main`/`staging`, pushes to them |
| `stop-triage.ts` | before Claude finishes | runs `pnpm triage`; if red, Claude must fix it first                 |

A hook that passes is silent and costs no tokens. The Stop hook skips the run when nothing changed since the last
green triage.

## Architecture docs and ADRs

| Where                         | Contains                                                  | Changes                                             |
| ----------------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| `docs/architecture/<part>.md` | the decided design only: what it is, boundaries, flows    | updated whenever the design changes                 |
| `docs/adr/NNNN-*.md`          | why: requirements, options considered, why the winner won | never edited once accepted; superseded by a new ADR |

An ADR is written only when there was a real choice: at least two viable options and a decision that is costly to
reverse. Example: "WebSocket or HTTP between SDK and connector?" goes through `/architect`. The result is a
transport section in `docs/architecture/sdk.md` describing how the WebSocket connection works, and
`docs/adr/0002-use-websocket-for-sdk-transport.md` explaining why HTTP polling and SSE lost. A choice with no real
alternative only updates the architecture doc.

## Typical flow

```text
idea ──/ticket──▶ ready ticket ──/task──▶ branch, plan, code + tests ──▶ triage green ──▶ you commit, PR, merge
                      │                        │
                      └── open design question ┴──▶ /architect ──▶ architecture doc (+ ADR)
```

1. `/ticket <idea>`: Claude asks questions in rounds until the ticket has a clear problem, behavior, acceptance
   criteria and technical context.
2. If the ticket hides an open design question, `/architect <topic>` settles it first.
3. `/task <ticket>`: Claude creates the branch, plans (stops for approval on large tasks), implements with tests.
4. Hooks keep files formatted; the Stop hook makes Claude fix red checks and coverage gaps.
5. Claude follows triage actions: tests, review, ADR question, docs, and ends with a proposed commit message.
6. You read the diff, commit, open a PR. CI runs, a code owner approves, squash merge.

For long discussions (`/ticket`, `/architect`) switch to plan mode (Shift+Tab) so the whole conversation runs on the
planning model (skill `model` settings apply only to the first reply). Leave plan mode when it is time to write
the ticket or the docs.
