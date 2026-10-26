# Development

How to build, test and change ProbeX. To use ProbeX in an app, read the [README](../README.md) instead.

Before you change anything, read the [architecture overview](architecture/overview.md): what the parts are, how a
debugging session flows through them, and which [decisions](adr/) are already made.

## Repository

A pnpm monorepo in TypeScript (strict, NodeNext) with Vitest, ESLint and Prettier. Dependencies point down the
table only, and packages import each other by package name, never by relative path.

| Package               | Holds                                                         | May depend on |
| --------------------- | ------------------------------------------------------------- | ------------- |
| `packages/configs`    | shared tsconfig, ESLint, Prettier and Vitest presets          | -             |
| `packages/protocol`   | messages, `PROTOCOL_VERSION` and the `Connector` type         | -             |
| `packages/sdk`        | `src/debugger/` and `src/connector/`, run inside the host app | protocol      |
| `examples/node-basic` | demo app to try the SDK by hand                               | sdk           |

A package exports its `src/index.ts` under the `@probex-platform/source` condition, which `pnpm dev`, tests and
typecheck resolve: packages read each other's sources directly, so development needs no build step.

## Setup

Requires Node.js ≥ 22 and pnpm 10.

```sh
git clone https://github.com/ProbeX-Platform/probex-platform.git
cd probex-platform
pnpm install   # install and link workspace packages
pnpm verify    # everything must pass on a fresh clone
```

## Commands

```text
pnpm dev        → every package and the demo app in watch mode (tsx --watch)
pnpm build      → build every package to dist/, dependencies first
pnpm typecheck  → typecheck every package, then the root files and tests
pnpm test       → one Vitest run over all packages
pnpm lint       → one ESLint run over the repo
pnpm format     → one Prettier check over the repo
pnpm verify     → lint → format → typecheck → test:coverage (≥ 80%), stops at the first failure
pnpm verify:fix → auto-fix lint and formatting
```

One package: `pnpm --filter @probex-platform/sdk test`, `pnpm --filter @probex-platform/node-basic dev`. CI runs
`pnpm verify` on every pull request.

## Testing

- Tests sit next to the code as `*.test.ts`. Coverage of `packages/*/src` must stay ≥ 80% in lines, branches and
  functions.
- Test behavior through the public surface. Mock only at the boundaries: the WebSocket, time and `node:inspector`.
- SDK code also tests its failure paths: it must prove it does not throw into or block the host app.

Full rules: [testing](../.claude/rules/testing.md).

## Making a change

1. **Design first.** A change to how parts work together updates [docs/architecture](architecture/overview.md) in
   the same PR, with an [ADR](adr/) when the choice is costly to reverse for users or peers.
2. **Public API.** A change to an export, option or environment variable updates [docs/api](api/overview.md) in the
   same PR.
3. **Protocol.** A change in `packages/protocol` stays backward-compatible or bumps `PROTOCOL_VERSION`:
   [changing the protocol](architecture/protocol.md#changing-the-protocol).
4. **SDK.** It runs in someone else's production app: never throw into, crash or block it; no sync I/O on the hot
   path; no new runtime dependency without an ADR. See [SDK rules](../.claude/rules/sdk.md).
5. **Check.** `pnpm verify`, then open a pull request to `staging`.

Coding rules for TypeScript, the SDK, the protocol, tests, docs and ADRs: [.claude/rules](../.claude/rules/). AI
agents also follow [CLAUDE.md](../CLAUDE.md).

## Branches and pull requests

- Branch from an up-to-date `staging` as `<type>/<kebab-case>`, ≤ 50 chars, lowercase only. `main` is
  release-only and accepts pull requests only from `staging`.
- Commits and PR titles follow Conventional Commits, ≤ 100 chars, such as `feat(sdk): capture closure scopes`.
  PRs go to `staging` and are merged with merge commits, so every commit must follow the rule. Release PRs from
  `staging` into `main` check only the title.
- Use one of these types; release tooling maps them to the changelog and semver. A change that spans several types
  is split into commits, or takes the main type and a scope: `ci(infra): …`.

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

- CI checks the names with `.github/scripts/check-names.sh`, the source of these rules. Run it before pushing:
  `bash .github/scripts/check-names.sh <branch> "<pr title>" origin/staging..HEAD`.
