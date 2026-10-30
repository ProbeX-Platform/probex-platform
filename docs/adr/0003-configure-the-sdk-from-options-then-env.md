# 0003. Configure the connector from options, then env

## Status

Accepted · 2026-10-21

## Context

In most apps the SDK creates the default connector itself, and the hub URL differs per deployment (local, staging,
production) and is set by whoever runs the app, often without touching its code. The same connector is also
created directly in code and in tests, sometimes twice in one process with different settings.

## Decision

We resolve each `HubConnector` option once, in the constructor: the passed value, then its `PROBEX_*` environment
variable, then the default. Only values that differ per deployment get an environment variable; today that is
`PROBEX_HUB_URL`.

## Alternatives

- **Options only** — every app would repeat the same code to read the environment, and pointing an app at another
  hub would need a code change wherever that code was not written.
- **Environment only** — two connectors in one process could not differ, tests would have to change
  `process.env`, and code could not override what the environment says.

## Consequences

- An app connects to a hub with no ProbeX code beyond starting the SDK.
- Environment variable names are public API: they are documented in `docs/api/` and renaming one is a breaking
  change.
- Changes to `process.env` after a connector is created do not affect it.
