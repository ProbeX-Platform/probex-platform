---
paths:
  - "**/*.ts"
---

# TypeScript

- Comments explain WHY (constraint, trade-off, non-obvious behavior), never WHAT the next line does.
- No commented-out code, no TODO comments: open a ticket instead.
- TSDoc: one line, only on exported public API of `packages/sdk` and `packages/connector`.
- Named exports only. No `any`; use `unknown` and narrow.
- Explicit return types on exported functions.
- Throw typed error classes (`class BreakpointError extends Error`), never strings.
- Small single-purpose functions; split when a function needs a comment to explain its sections.
- Import other packages by name (`@probex/protocol`), never `../../other-package/src`.

```ts
// Bad
// get the user
export default function get(id: any) {
  /* ... */
}
// const old = legacy(id);

// Good
/** Resolves a breakpoint location to a script position. */
export function resolveLocation(location: Location): ScriptPosition {
  // V8 reports 0-based columns while users give 1-based ones
  return { line: location.line, column: location.column - 1 };
}
```
