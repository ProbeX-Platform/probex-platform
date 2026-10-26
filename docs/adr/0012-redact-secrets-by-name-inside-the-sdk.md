# 0012. Redact secrets by name inside the SDK

## Status

Accepted · 2026-10-26

## Context

A snapshot holds the values of the variables in scope at a breakpoint. In production these often include passwords,
API keys, tokens, cookies and session ids. Once such a value leaves the host app, it sits in the hub's storage, UI
and logs, out of the app owner's control. Redaction must cost little within the 10 ms pause budget, must work
without setup, and must not depend on a hub that may be third-party or custom.

## Decision

We redact values inside the SDK, by variable and property name, with a built-in list of secret names that the host
app can extend through `redact` or `PROBEX_REDACT` but not shrink. A redacted value is sent as `{ type: "redacted" }`
and is never read from V8.

## Alternatives

- **Redact in the hub** — the secret still crosses the network and reaches every hub, including custom ones that
  may skip it.
- **Scan string values for patterns, such as card numbers or JWTs** — catches secrets under harmless names, but
  every string costs regex time inside the pause budget, and false matches are frequent. It can be added later as
  an opt-in.
- **No built-in list, opt-in only** — a team that skips setup leaks secrets from day one.
- **Rules set by the hub per breakpoint** — whoever controls the hub could switch redaction off and read secrets
  from any app.

## Consequences

- Common secrets never leave the app, with no setup.
- Matching by contained name hides some harmless values, such as `sessionCount`; the host app cannot unhide them.
- A secret under a harmless name, or inside a string such as a URL, is captured as is.
- The protocol gains the `redacted` value type, an addition: older readers show it as unavailable, so
  `PROTOCOL_VERSION` stays 1.
- Opt-in value patterns are possible later as a new option, without a protocol change.
