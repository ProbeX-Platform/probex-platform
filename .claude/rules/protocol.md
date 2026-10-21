---
paths:
  - "packages/protocol/**"
---

# Protocol

`@probex-platform/protocol` is the public contract: the types and constants the SDK, custom connectors and the hub use,
including the messages they exchange (the protocol), and the public types end users need (`Connector`, `Breakpoint`,
`Snapshot`). Consumers are TypeScript and JavaScript only; the types are the full protocol spec.

- Only what both ends of the wire must agree on: messages, protocol constants, the `Connector` interface and the data
  types messages carry. Helpers and one package's internal types stay in that package, however many packages use
  them. See [ADR 0001](../../docs/adr/0001-keep-the-protocol-in-its-own-package.md).
- Types and constants only: no runtime logic, no side effects, no dependencies.
- Messages go over the wire as JSON: use values that survive `JSON.stringify` → `JSON.parse` unchanged. No `Date`,
  `Map`, `Set`, `bigint`, `undefined` values or class instances.
- The SDK, custom connectors and the hub may run different versions: every message carries the protocol
  version.
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
