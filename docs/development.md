# Development

ProbeX is a pnpm monorepo in TypeScript (strict, NodeNext) with Vitest, ESLint and Prettier.

| Package               | Role                                                 |
| --------------------- | ---------------------------------------------------- |
| `packages/configs`    | shared tsconfig, ESLint, Prettier and Vitest presets |
| `packages/protocol`   | messages, protocol version and the `Connector` type  |
| `packages/sdk`        | debugger and default connector, runs in the host app |
| `examples/node-basic` | demo app                                             |

## Setup

Requires Node.js ≥ 22 and pnpm 10.

```sh
pnpm install   # install and link workspace packages
pnpm dev       # run every package in watch mode
pnpm verify    # lint, format, typecheck, tests with coverage: run before a PR
```

No build step is needed for development: packages read each other's sources directly.

## Commands

```text
pnpm dev        → dev in every package, in parallel (tsx --watch)
pnpm build      → build in every package, dependencies first
pnpm typecheck  → typecheck in every package, then the root files and tests
pnpm test       → one Vitest run over all packages
pnpm lint       → one ESLint run over the repo
pnpm format     → one Prettier check over the repo
pnpm verify     → lint → format → typecheck → test:coverage (≥ 80%), stops at the first failure
pnpm verify:fix → auto-fix lint and formatting
```

Run one package's tests with `pnpm --filter @probex-platform/sdk test`. CI runs `pnpm verify`.

## Branches and pull requests

- Branch from an up-to-date `staging` as `<type>/<kebab-case>`, ≤ 50 chars, lowercase only; `main` is
  release-only and accepts pull requests only from `staging` (CI fails any other source branch).
- Commits and PR titles follow Conventional Commits, ≤ 100 chars; type and scope may be in any case. PRs go to
  `staging` and are merged with merge commits, so every commit must follow the rule. Release PRs from `staging`
  into `main` check only the title: their commits were checked in their own PRs.
- Branches, PR titles and commits use one of these types; release tooling maps them to the changelog and semver.
  A change that spans several types is split into commits, or takes the main type and a scope: `ci(infra): …`.

  | Type       | For                                            |
  | ---------- | ---------------------------------------------- |
  | `feat`     | new behavior for users of the packages (minor) |
  | `fix`      | bug fix for users of the packages (patch)      |
  | `perf`     | faster or lighter, same behavior               |
  | `refactor` | code change with the same behavior             |
  | `docs`     | documentation only                             |
  | `test`     | tests only                                     |
  | `build`    | build, dependencies, package and tool configs  |
  | `ci`       | CI workflows, hooks and their scripts          |
  | `chore`    | anything else that does not reach users        |
  | `style`    | formatting only                                |
  | `revert`   | reverts an earlier commit                      |

- CI checks the names with `.github/scripts/check-names.sh`, the source of these rules; run it locally as
  `bash .github/scripts/check-names.sh <branch> "<pr title>" origin/staging..HEAD`.
- A public API change updates [docs/api](api/) in the same PR; a design change goes to
  [docs/architecture](architecture/overview.md) and, when there was a real choice, an [ADR](adr/).
