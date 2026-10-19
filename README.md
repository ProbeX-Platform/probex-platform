# ProbeX

Open-source runtime debugger for Node.js: non-breaking breakpoints and snapshots in running applications.

> Early development. APIs are not stable yet.

## Quick start

Requires Node.js ≥ 22 and pnpm 10.

```sh
pnpm install   # install and link workspace packages
pnpm dev       # run every package in watch mode
pnpm verify    # lint, format, typecheck, tests with coverage: run before a PR
```

No build step is needed for development: packages read each other's sources directly.

## Workspace commands

```text
pnpm dev        → dev in every package, in parallel (tsx --watch)
pnpm build      → build in every package, dependencies first: shared → sdk, connector → examples
pnpm typecheck  → typecheck in every package, then the root files and tests
pnpm test       → one Vitest run over all packages (not per-package scripts)
pnpm lint       → one ESLint run over the repo
pnpm format     → one Prettier run over the repo
pnpm verify     → lint → format:check → typecheck → test:coverage, stops at the first failure
```

Run one package's tests with `pnpm --filter @probex/sdk test`.

## Documentation

- [Vision](docs/vision.md) — goals and principles.
- [Architecture](docs/architecture/overview.md) — how ProbeX is built.
- [API](docs/api/) — public API of each package.
- [Architecture decisions](docs/adr/) — why things are built this way.

## Security

See [SECURITY.md](SECURITY.md). License: [MIT](LICENSE).
