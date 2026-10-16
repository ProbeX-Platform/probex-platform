---
paths:
  - "**/*.test.ts"
---

# Testing

- Test behavior through the public surface, not private helpers or call order.
- Mock only at boundaries: transport, time, `node:inspector`. Never mock the module under test.
- Name tests `it("does X when Y")`; one behavior per test.
- Every acceptance criterion of the ticket maps to at least one test.
- Cover the failure path: SDK code must prove it does not throw into the host app.

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
