# ProbeX

Open-source runtime debugger for Node.js (Rookout-like): set non-breaking breakpoints and capture snapshots in running apps.
Developers embed it in their own apps, so the public API, protocol and docs are part of the product.

## Packages

pnpm monorepo, Node >= 22, TypeScript (strict, NodeNext), Vitest, ESLint, Prettier.

| Package               | Role                                           | May depend on |
| --------------------- | ---------------------------------------------- | ------------- |
| `packages/configs`    | shared tsconfig / eslint / prettier / vitest   | -             |
| `packages/protocol`   | planned: wire types between sdk and connector  | -             |
| `packages/sdk`        | debugger core on `node:inspector`, in host app | protocol      |
| `packages/connector`  | transport between sdk and the outside world    | protocol      |
| `examples/node-basic` | demo app                                       | sdk           |

Dependencies point down this table only. Never create `packages/protocol` without an approved ADR.

## Commands

- `pnpm verify` — full gate: lint, format, typecheck, tests.
- `pnpm triage [--json]` — blast radius, checks, diff coverage and suggested actions. Exit 1 = red.
- `pnpm --filter @probex/sdk test` — one package.

## Workflow

Use `/task` for any ticket. In short: plan → implement with tests → `pnpm triage` → act on its actions → propose a commit message.

| triage action          | do                                                                                |
| ---------------------- | --------------------------------------------------------------------------------- |
| `fix-checks`           | fix the failing check                                                             |
| `write-tests`          | write the missing tests yourself                                                  |
| `delegate-unit-tester` | delegate to the `unit-tester` agent                                               |
| `review`               | delegate to the `reviewer` agent                                                  |
| `adr`                  | ask the user whether there was a real design choice; if yes, suggest `/architect` |
| `docs`                 | update `docs/api/` for the changed public API                                     |
| `e2e`                  | tell the user; there is no e2e suite yet                                          |

Hooks format every edited file and run triage before you finish; fix what they report instead of arguing with it.

## Hard rules

- The SDK must never crash, throw into, or block the host app.
- Packages import each other only by package name, never by relative path.
- Protocol changes are backward-compatible or bump the protocol version.
- `docs/architecture/` holds only decided designs; an ADR records why, only when there was a real choice.
- Branches: `<type>/<kebab-case>` (≤ 50 chars), e.g. `feat/breakpoint-snapshot`.
- Commits and PR titles: Conventional Commits, ≤ 72 chars. PRs are squash-merged, so the PR title becomes the commit.
- Never commit or push unless asked; propose the commit message instead. Never edit `pnpm-lock.yaml` by hand.

## Docs

- `docs/development.md`, `docs/tooling.md` — workflow and what every script and hook does.
- `docs/vision.md` — goals and principles.
- `docs/adr/` — decisions; read the relevant ones before changing architecture.
- `docs/architecture/`, `docs/api/` — component design and public API.
- `docs/glossary.md` — use these terms in code and docs.
