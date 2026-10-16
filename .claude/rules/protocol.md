---
paths:
  - "packages/protocol/**"
---

# Protocol

The protocol is a contract with SDKs we do not control, possibly in other languages.

- Pure data: types and schemas only, no runtime logic, no Node-specific types.
- Language-neutral: JSON-serializable values, no `Date`, `Map`, `bigint` or class instances.
- Versioned: every message carries the protocol version.
- Backward-compatible: add optional fields; never rename, remove or retype. Breaking change = version bump + ADR.

```ts
// Bad
export interface Snapshot {
  capturedAt: Date;
  frames: Map<string, Frame>;
}

// Good
export interface Snapshot {
  version: 1;
  capturedAt: string; // ISO 8601
  frames: Frame[];
  tags?: string[]; // added later, optional for old clients
}
```
