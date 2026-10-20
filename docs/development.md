# Development

ProbeX is a pnpm monorepo in TypeScript (strict, NodeNext) with Vitest, ESLint and Prettier.

| Package               | Role                                                    |
| --------------------- | ------------------------------------------------------- |
| `packages/configs`    | shared tsconfig, ESLint, Prettier and Vitest presets    |
| `packages/shared`     | public types, protocol and constants                    |
| `packages/connector`  | default transport from the SDK to the hub               |
| `packages/sdk`        | debugger core on `node:inspector`, runs in the host app |
| `examples/node-basic` | demo app                                                |

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

Run one package's tests with `pnpm --filter @probex/sdk test`. CI runs `pnpm verify`.

## Branches and pull requests

- Branch from an up-to-date `staging` as `<type>/<kebab-case>`, ≤ 50 chars; `main` is release-only.
- Commits and PR titles follow Conventional Commits, ≤ 100 chars. PRs go to `staging` and are merged with merge
  commits, so every commit must follow the rule.
- A public API change updates [docs/api](api/) in the same PR; a design change goes to
  [docs/architecture](architecture/overview.md) and, when there was a real choice, an [ADR](adr/).
