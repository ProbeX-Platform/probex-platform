# 0001. Record architecture decisions as ADRs

## Status

Accepted · 2026-10-16

## Context

ProbeX is a debugger that other developers embed in their apps and extend. Contributors and integrators need to know
how the system is built and why the protocol, the public API and the package boundaries look the way they do. That
knowledge must survive the people and the conversations that produced it, without burying the current design under
the history of how we got there.

## Decision

We describe the current design in `docs/architecture/` and record each decision that had real alternatives as an ADR
in `docs/adr/`, in the same pull request as the change.

## Alternatives

- **Design notes in issues or PR descriptions** — hard to find later and not versioned with the code.
- **Only an evolving architecture document** — loses the history of why a decision changed.
- **An ADR for every decision** — noise for obvious choices; the important records get lost.

## Consequences

- Architecture docs stay short and current: only decided designs, no discussions.
- Accepted ADRs are immutable: changing a decision means a new ADR that supersedes the old one.
- `pnpm triage` checks ADR format and suggests asking for an ADR when a change touches architecture.
