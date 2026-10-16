# 0001. Record architecture decisions as ADRs

## Status

Accepted · 2026-10-16

## Context

ProbeX is a debugger that other developers embed in their apps and extend. Contributors and integrators need to know
why the protocol, the public API and the package boundaries look the way they do, and that knowledge must survive
the people and the conversations that produced it.

## Decision

We record every architecture decision as an ADR in `docs/adr/`, in the same pull request as the change it describes.

## Alternatives

- **Design notes in issues or PR descriptions** — hard to find later and not versioned with the code.
- **One evolving architecture document** — loses the history of why a decision changed.

## Consequences

- Architecture changes take one extra file; reviewers can reject a PR that lacks it.
- Accepted ADRs are immutable: changing a decision means a new ADR that supersedes the old one.
- `pnpm triage` checks ADR format and suggests an ADR when a change touches architecture.
