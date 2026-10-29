---
paths:
  - "**/*.ts"
---

# TypeScript

From the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) (§ = its section), with
ProbeX deviations marked _ProbeX_. Prettier owns formatting; ESLint (`packages/configs/eslint`) enforces what it can.
Design, naming and efficiency: [code quality](code-quality.md).

## Comments

- Comments explain WHY (constraint, trade-off, non-obvious behavior), never WHAT the next line does.
- No commented-out code, no TODO comments: open a ticket instead.
- TSDoc: one line on every export of a package's public API (`sdk`, `protocol`, the `configs` typings). `@param`
  and `@returns` only when they add information; `@deprecated` names the replacement. (§ Comments)

## Modules

- Named exports only; a default export only where a tool requires it (`*.config.ts`). (§ Exports, ESLint)
- Export only what other modules use. No `export let`, no static-only container classes. (§ Exports)
- `import type` for types; `node:` prefix for built-ins (Node BP 6.27); no namespaces, no `require`.
- Import other packages by name (`@probex-platform/protocol`), never `../../other-package/src`.
- No side effects at module load: no I/O, timers or listeners at the top level. (Node BP 3.13)

## Functions

- Arrow functions (`const name = (...): T => ...`); `function` only where required: `this` binding, generators,
  overloads. _ProbeX: Google prefers declarations; we keep one style, as Node BP 3.12 does._ (ESLint)
- Explicit return types on exported functions. _ProbeX: stricter than Google._ (ESLint)
- Default parameter values are simple and side-effect free; rest parameters, never `arguments`.
- Wrap a named function in an arrow before passing it as a callback when extra arguments could reach its optional
  parameters (`ids.map((id) => parseId(id))`). (§ Functions)

## Types

- No `any` or `{}`: use `unknown` and narrow. (§ Any, ESLint)
- `interface` for object shapes, `type` for unions and mapped types. String-literal unions, never `enum`.
  _ProbeX: Google allows plain enums; ours travel as JSON._ (ESLint)
- Avoid `as` and `!`; when one is safe, a comment says why. Annotate object literals (`const x: Foo = {...}`)
  instead of asserting them. (§ Type assertions, ESLint)
- `undefined` for absence, not `null`, unless a protocol field defines `null`. _ProbeX: Google leaves it open._
- A type alias does not include `| undefined`: make the field optional or add it where the alias is used.
- The simplest type that works: a repeated field beats a clever mapped type. No generic that appears only in the
  return type. (§ Type system)
- No `@ts-ignore` or `@ts-nocheck`; `@ts-expect-error` only in type tests. (ESLint)

## Classes

- `readonly` on every field not reassigned after the constructor (ESLint); parameter properties for injected
  dependencies. Do not add or remove properties after construction. (§ Classes)
- TypeScript `private`, not `#private` (ESLint); no `public` keyword; no `_` prefix on members.
- Getters are pure and do real work; no pass-through accessors. `toString()` never throws.
- Prefer a module-level function over a private static method; no `this` in static methods.

## Errors

- Throw only `new` typed `Error` subclasses (`class BreakpointError extends Error`), never strings; reject promises
  with them too. Rethrow with `{ cause }`. (§ Exceptions, Node BP 2.2, ESLint)
- Error messages and `cause` never carry captured values, tokens or URLs with credentials: they end up in logs
  ([ADR 0006](../../docs/adr/0006-authenticate-to-the-hub-with-a-bearer-token.md),
  [ADR 0012](../../docs/adr/0012-redact-secrets-by-name-inside-the-sdk.md)).
- Keep a `try` block to the lines that can throw. An empty `catch` holds a comment saying why.
- Never leave a promise floating; `return await` inside `try`. (Node BP 2.12, ESLint)
- Listen to `'error'` on every emitter and stream you create. (Node BP 2.13)
- In `packages/sdk`, errors stop at the boundary: see [SDK](sdk.md).

## Control flow

- `===` and `!==`; `== null` only to match both `null` and `undefined`. (ESLint)
- A `switch` on a union covers every member; any other `switch` ends with `default`. (ESLint)
- `for...of` over arrays and `Object.entries()`; never `for...in`. No nested ternaries. (ESLint)

```ts
// Bad
// get the user
export default function get(id: any) {
  /* ... */
}
// const old = legacy(id);

// Good
/** Resolves a breakpoint location to a script position. */
export const resolveLocation = (location: Location): ScriptPosition => {
  // V8 reports 0-based columns while users give 1-based ones
  return { line: location.line, column: location.column - 1 };
};
```
