# Tooling reference

What every script, hook and config in the repository does and why it exists. For the day-to-day workflow see the
[development guide](development.md).

## Design principles

- **Deterministic first.** Anything with one correct answer (formatting, types, coverage, which packages a change
  affects) is computed by a script, never guessed by an LLM.
- **Silent when green.** Hooks and checks print nothing on success, so they cost no tokens and no attention.
- **Same checks everywhere.** Claude Code, humans and CI run the same scripts; Claude only gets them earlier.

## `pnpm triage` — `scripts/triage.ts`

Answers three questions about the current branch: what changed, what it affects, and is it ready.

### Steps

1. **Base.** `git merge-base ${BASE:-origin/main} HEAD`, falling back to `main`. Set `BASE=<ref>` to compare against
   something else, e.g. `BASE=HEAD pnpm triage` checks only uncommitted work.
2. **Changed files.** `git diff --name-only <base>` (committed, staged and unstaged) plus untracked files.
3. **Kind.**
   - `none`: nothing changed.
   - `docs-only`: every file is `*.md` or under `docs/`.
   - `code`: at least one `.ts/.js/.mjs/.cjs` file that is not a `*.config.*` file.
   - `config`: everything else (package.json, tsconfig, YAML, `*.config.ts`).
4. **Packages.** Workspace packages owning a changed file, then every package that depends on them, transitively
   (from `dependencies`, `devDependencies`, `peerDependencies` of `packages/*` and `examples/*`).
5. **Touches** (sensitive areas):
   - `publicApi`: `packages/*/src/index.ts` changed, or the `exports` field of a package manifest changed;
   - `protocol`: anything in `packages/protocol/`;
   - `transport`: anything in `packages/connector/src/`;
   - `dependencies`: `dependencies` or `peerDependencies` of a `packages/*` manifest changed;
   - `newPackage`: a new `packages/*/package.json`.
6. **Checks.** Only on changed files where possible:

   | Check    | Runs                                                                  | docs-only |
   | -------- | --------------------------------------------------------------------- | :-------: |
   | `format` | `prettier --check` on changed `.ts/.js/.json/.md/.yml` files          |     ✓     |
   | `names`  | current branch name and every commit subject since the base           |     ✓     |
   | `docs`   | doc titles ≤ 60 chars; ADR structure (below) if `docs/adr/` changed   |     ✓     |
   | `lint`   | `eslint --max-warnings 0` on changed `.ts` files                      |           |
   | `types`  | `pnpm --filter "...[<base>]" typecheck` + root `tsc -p .`             |           |
   | `tests`  | `vitest run --changed <base> --coverage`: tests related to the change |           |

7. **Diff coverage.** For each changed file in `packages/*/src` (not tests, not `.d.ts`), line coverage from
   `coverage/coverage-summary.json` of that test run. A file no test touched counts as 0%. Thresholds: 90% for
   `packages/protocol/**` and `packages/sdk/src/core/**`, 85% elsewhere. `examples/` is not measured.
8. **Actions**, from the results:

   | Action                 | When                                                                                       |
   | ---------------------- | ------------------------------------------------------------------------------------------ |
   | `fix-checks`           | any check is red                                                                           |
   | `write-tests`          | coverage gap in 1–2 files                                                                  |
   | `delegate-unit-tester` | gap in 3+ files, or a new file with 0% coverage                                            |
   | `e2e`                  | `protocol`, `transport` or `publicApi` touched                                             |
   | `review`               | diff over 300 lines, or `publicApi` touched                                                |
   | `adr`                  | `newPackage`, `dependencies`, `protocol` or `publicApi` touched and no new ADR in the diff |
   | `docs`                 | `publicApi` touched and nothing under `docs/api/` changed                                  |
   | `none`                 | none of the above                                                                          |

   `adr`, `docs`, `e2e` and `review` are suggestions: a human decides. Only red checks and coverage gaps fail.

### Output

Text by default (short, failing details indented under `✗` lines), full report with `--json`.
Exit code 1 when a check is red or there is a coverage gap, otherwise 0.

### ADR checks

When anything in `docs/adr/` changes, every ADR (except `README.md` and `0000-template.md`) is checked:

- file name `NNNN-kebab-title.md`, numbers consecutive from `0001`;
- first heading `# NNNN. Title`, with the number matching the file and the title ≤ 60 chars;
- sections `## Status`, `## Context`, `## Decision`, `## Alternatives`, `## Consequences`;
- status line starts with `Proposed`, `Accepted`, `Deprecated` or `Superseded by [NNNN]`;
- the file is linked from `docs/adr/README.md`.

## Other scripts

| File                       | Used by           | Does                                                                                               |
| -------------------------- | ----------------- | -------------------------------------------------------------------------------------------------- |
| `scripts/check-names.ts`   | CI (`ci` job)     | validates the PR branch (`BRANCH`) and PR title (`TITLE`); `staging` and `dependabot/*` are exempt |
| `scripts/lib/git.ts`       | triage, hooks     | merge-base, changed/added/untracked files, diff size, file at a ref                                |
| `scripts/lib/run.ts`       | triage, hooks     | runs a command without colors, returns ok + output; local `node_modules/.bin` lookup               |
| `scripts/lib/naming.ts`    | triage, hooks, CI | branch, Conventional Commit and title rules and length limits                                      |
| `scripts/lib/docs.ts`      | triage            | doc title and ADR checks                                                                           |
| `scripts/lib/workspace.ts` | triage            | workspace package graph and package.json field comparison                                          |
| `scripts/lib/checks.ts`    | triage            | the individual checks listed above                                                                 |

Limits live in one place, `scripts/lib/naming.ts`: branch 50, commit/PR subject 72, doc/ADR title 60 characters.

## Claude Code hooks — `.claude/hooks/`

Registered in `.claude/settings.json`, run with the repo's `tsx`. Exit code 2 sends a short message (at most 20 lines)
back to Claude; anything else is silent.

| Hook             | Event                  | Behavior                                                                                                                                                                                                                                                         |
| ---------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `format-file.ts` | PostToolUse Edit/Write | For `.ts/.js/.json/.md` inside the repo: `prettier --write`, and for `.ts` also `eslint --fix`. Leftover errors → exit 2.                                                                                                                                        |
| `guard-git.ts`   | PreToolUse Bash        | Blocks creating a branch with a bad name, committing or pushing while on `main`/`staging`, and pushing to `main`/`staging`. ~0.2 s per command.                                                                                                                  |
| `stop-triage.ts` | Stop                   | Skips if `stop_hook_active` (no loops), if nothing changed since the base, or if the tree is identical to the last green run (cached in `node_modules/.cache/probex`). Otherwise runs triage; red → exit 2 with only the failing lines, so Claude keeps working. |
| `lib.ts`         | —                      | stdin parsing, repo root lookup, truncated exit-2 output                                                                                                                                                                                                         |

## Claude Code settings — `.claude/settings.json`

- **Hooks** as above.
- **Allow** without asking: `pnpm verify*`, `pnpm triage*`, `pnpm test*`, `pnpm lint*`, `git status/diff/log`.
- **Deny**: editing `pnpm-lock.yaml`, any form of `git push --force` / `-f`.
- **No model**: model and effort are personal, set in `~/.claude/settings.json`.
- `.claude/settings.local.json` is personal and git-ignored, e.g. for extra allow rules for a shell wrapper.

## Repository configs

| File                                       | Does                                                                                                                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/configs/tsconfig/base.json`      | strictness and module settings shared by every TypeScript project; Node types                                                                                                    |
| `packages/configs/tsconfig/workspace.json` | `base` + build settings for a package: `src/` → `dist/` via `${configDir}`, composite, declarations                                                                              |
| `tsconfig.json` (root)                     | `base` + `noEmit` for root-level code: scripts, hooks, Vitest configs, example tests                                                                                             |
| `packages/configs/eslint`                  | typescript-eslint strict + stylistic (type-checked), import order, no import cycles, no relative imports between packages, no TODO comments, functions ≤ 50 lines (tests exempt) |
| `packages/configs/prettier`                | 120 columns, double quotes, semicolons, trailing commas                                                                                                                          |
| `packages/configs/vitest`                  | per-package test config: `**/*.test.ts`                                                                                                                                          |
| `vitest.config.ts` (root)                  | workspace projects + V8 coverage of `packages/*/src`                                                                                                                             |
| `.github/workflows/ci.yml`                 | install, branch/PR title, lint, format, typecheck, tests, build                                                                                                                  |
| `.github/workflows/dependency-review.yml`  | fails PRs that add dependencies with high-severity vulnerabilities                                                                                                               |
| `.github/CODEOWNERS`                       | who must approve changes per path                                                                                                                                                |
