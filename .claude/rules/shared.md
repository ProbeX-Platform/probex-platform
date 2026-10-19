---
paths:
  - "packages/shared/**"
---

# Shared

`@probex/shared` is the public contract: the types and constants the SDK, the connector and the hub use, including
the messages they exchange (the protocol), and the public types end users need (`Connector`, `Breakpoint`,
`Snapshot`). Consumers are TypeScript and JavaScript only; the types are the full protocol spec.

- Only what at least two packages use, or a public type end users need. Anything else lives in its package; move it
  here when it qualifies, and move it back out when it no longer does.
- Types and constants only: no runtime logic, no side effects, no dependencies.
- Messages go over the wire as JSON: use values that survive `JSON.stringify` → `JSON.parse` unchanged. No `Date`,
  `Map`, `Set`, `bigint`, `undefined` values or class instances.
- The SDK and the connector may run different versions: every message carries the protocol version.
- Backward-compatible: add optional fields; never rename, remove or retype. A breaking change bumps the protocol
  version.

```ts
// Bad
export interface Snapshot {
  capturedAt: Date;
  frames: Map<string, Frame>;
}

// Good
export const PROTOCOL_VERSION = 1;

export interface Snapshot {
  version: typeof PROTOCOL_VERSION;
  capturedAt: string; // ISO 8601
  frames: Frame[];
  tags?: string[]; // added later, optional for old clients
}
```
