---
paths:
  - "packages/sdk/**"
---

# SDK

The SDK runs inside someone else's production app. Being invisible matters more than being clever.

- Never block the event loop: no sync I/O, no busy loops, no unbounded work on the hot path.
- Overhead budget: a disabled breakpoint costs ~0; a snapshot is bounded in depth, size and time.
- Every hook into user code is wrapped in try/catch and time-bound; failures are logged, never rethrown.
- No heavy runtime dependencies; prefer Node built-ins. A new dependency needs an ADR.

```ts
// Bad
session.on("Debugger.paused", (event) => {
  send(capture(event)); // throws into the host app on any failure
});

// Good
session.on("Debugger.paused", (event) => {
  try {
    send(capture(event, { maxDepth: 3, timeoutMs: 10 }));
  } catch (error) {
    logger.warn("snapshot failed", error);
  }
});
```
