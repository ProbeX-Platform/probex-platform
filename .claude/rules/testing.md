---
paths:
  - "**/*.test.ts"
---

# Testing

A test exists to fail when the behavior breaks. Coverage (≥ 80%, enforced by `pnpm test:coverage` and CI) is the
floor, not the goal: a line that runs without an assertion about its result is not tested.

- Test behavior through the public surface, not private helpers or call order.
- Mock only at boundaries: transport, time, `node:inspector`. Never mock the module under test.
- Name tests `it("does X when Y")`; one behavior per test; no logic (`if`, loops) inside a test.
- Assert the outcome (returned value, emitted message, state), not that a function was called.
- Every acceptance criterion of the card maps to at least one test.
- Cover the failure path: SDK code must prove it does not throw into or block the host app.
- Before finishing, ask of each test: would it fail if the code under test returned a wrong value? If not, fix it.

```ts
// Bad
it("works", () => {
  const spy = vi.spyOn(manager, "internalSet");
  manager.add(bp);
  expect(spy).toHaveBeenCalled();
});

// Good
it("returns an error result when the inspector session is closed", async () => {
  const manager = createManager(closedSession());
  await expect(manager.add(bp)).resolves.toEqual({ ok: false, reason: "session-closed" });
});
```
