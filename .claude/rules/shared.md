---
paths:
  - "packages/shared/**"
---

# Shared

`@probex/shared` holds the types and constants the SDK and the connector both use, including the messages they
exchange (the protocol). Consumers are TypeScript and JavaScript only.

- Only what at least two other workspace packages import. Used by one package → it lives in that package; move it
  here when a second package needs it, and move it back out when only one is left.
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
