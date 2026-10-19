# ProbeX

Open-source runtime debugger for Node.js: set non-breaking breakpoints in a running application and get snapshots
of its state, without changing code or redeploying.

> Early development. Packages are not published yet and APIs are not stable.

## How it works

- `@probex/sdk` runs inside your app. It sets breakpoints through `node:inspector`, captures the call stack and
  variables when one is hit, and resumes at once. It never crashes, throws into or blocks your app.
- `@probex/connector` carries breakpoints and snapshots between the SDK and the ProbeX hub over one outbound
  WebSocket. Your app opens no ports.
- `@probex/shared` holds the public types: `Breakpoint`, `Snapshot`, the `Connector` interface and the protocol.

Secrets are redacted inside your app before a snapshot leaves it. See the
[architecture overview](docs/architecture/overview.md).

## Requirements

Node.js ≥ 22.

## Documentation

- [Vision](docs/vision.md) — goals and principles.
- [Architecture](docs/architecture/overview.md) — how ProbeX is built.
- [API](docs/api/) — public API of each package.
- [Architecture decisions](docs/adr/) — why things are built this way.

## Contributing

- [Development](docs/development.md) — set up the repo, commands, branches and pull requests.
- [CLAUDE.md](CLAUDE.md) — rules and workflow for AI agents working in this repo.
- [Coding rules](.claude/rules/) — TypeScript, SDK, shared, testing, docs and ADR conventions.

## Security and license

See [SECURITY.md](SECURITY.md). License: [MIT](LICENSE).
