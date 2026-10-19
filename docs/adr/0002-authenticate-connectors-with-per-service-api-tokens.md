# 0002. Authenticate connectors with per-service API tokens

## Status

Accepted · 2026-10-19

## Context

The connector runs on customers' production servers and connects to the hub. Whoever controls the hub can set
breakpoints and read memory of the host app, so the connector must trust only the real hub, and the hub must accept
only real instances. Setup must stay one environment variable for teams without PKI. Credentials must be revocable
per service and must never leak through logs or URLs. Auth failures must not affect the host app.

## Decision

We authenticate connectors with a per-service, per-environment API token sent in the first `hello` message over
`wss://`, and the connector verifies the hub's TLS certificate. This is the current solution; any change to
authentication gets a new ADR that supersedes this one.

## Alternatives

- **Mutual TLS** — strongest instance identity, but every pod needs a client certificate to issue and rotate; too
  high a barrier for adoption. It can be added later as an opt-in.
- **Short-lived tokens via exchange** (JWT, workload identity) — best rotation, but needs a token endpoint on the
  hub, refresh logic in the connector and more failure modes before the hub even exists.

## Consequences

- Setup is one environment variable per service.
- Plain `ws://` is allowed only to `localhost`; a custom CA is optional for self-hosted hubs.
- The token never goes into the URL or logs. The hub closes connections that do not authenticate within a few
  seconds.
- On auth failure the connector logs, backs off and stays inert.
- The hub stores token hashes; rotation means issuing a new token and revoking the old one.
- A leaked token lets someone register a fake instance and send fake snapshots, but not control real apps.
- What a breakpoint command may make the SDK do (conditions, expressions) bounds the damage of a compromised hub and
  needs its own decision.
