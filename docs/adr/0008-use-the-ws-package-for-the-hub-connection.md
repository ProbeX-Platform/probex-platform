# 0008. Use the ws package for the hub connection

## Status

Accepted · 2026-10-21

## Context

The connector must never keep the host process alive: an app that would exit without ProbeX must still exit. It
also needs custom headers on the upgrade request for the token, WebSocket pings to detect dead connections and a
limit on incoming frame size. Node's built-in WebSocket client cannot be unref'd, sends no custom headers in the
standard API and cannot send pings. The SDK runs in other people's apps, so every runtime dependency is a cost.

## Decision

We use the `ws` package for the connection to the hub and pass it a `createConnection` that unrefs the socket.
This replaces the "only Node built-ins" part of
[ADR 0002](0002-ship-the-default-connector-inside-the-sdk.md); the rest of it stands.

## Alternatives

- **Node's built-in WebSocket** — keeps the process alive while the socket is open, and has no pings and no
  custom headers in the standard API.
- **Our own client on `node:http` and `node:tls`** — no dependency, but we would own an RFC 6455 framing parser,
  its conformance tests and its security fixes.

## Consequences

- One runtime dependency in the host app: `ws`, which has no dependencies of its own.
- `ws` versions are pinned to a range and updated through dependency review; a vulnerability in `ws` is a
  vulnerability in ProbeX.
- The connector controls headers, pings, payload limits and compression, and turns compression off.
- Follow-up: add `ws` and `@types/ws` to `@probex-platform/sdk`.
