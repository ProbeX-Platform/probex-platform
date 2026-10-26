# 0013. Publish the packages as ES modules and CommonJS

## Status

Accepted · 2026-10-26

## Context

Many Node.js apps that would embed the SDK still load packages with `require()`. ProbeX supports Node.js 22 or
later, but `require()` of an ES module works only from 22.12, and it prints an `ExperimentalWarning` to the host
app's stderr. The SDK must stay invisible in the host app, and it must work on every Node 22 release. Custom
connectors and hubs import `@probex-platform/protocol`, so it has the same consumers.

## Decision

We build `@probex-platform/sdk` and `@probex-platform/protocol` twice, as ES modules and as CommonJS, and the
`exports` map serves one for `import` and the other for `require()`.

## Alternatives

- **ES modules only, `engines` raised to `>=22.12`** — a single build, but every CommonJS app gets an
  `ExperimentalWarning` from ProbeX, apps on Node 22.0–22.11 cannot load it, and the sources may never use
  top-level `await`.
- **CommonJS only** — works everywhere through `import` too, but ES module apps lose named-export checks and
  tree-shaking, and the ecosystem is moving away from it.

## Consequences

- `import` and `require()` both work on every Node 22 release, without warnings.
- An app can load both builds, for example through two dependencies. The SDK keeps one debugger per process across
  copies, so this costs memory but not correctness.
- Each package has two build outputs and two type entry points to keep correct; a test loads each one.
