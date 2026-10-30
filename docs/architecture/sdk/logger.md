# Logger

## Purpose

The logger is how the SDK reports its own problems: one wrapper that the debugger and the connector write through,
which hands each line to the app's logger, or to `console` by default, without throwing into, blocking or flooding
the host app. It does not ship the app's own logs. How to use it: [API](../../api/sdk/logger.md).

## Boundaries

- Owns:
  - resolving `logger` and `logLevel`, and filtering lines below the level;
  - the message format and the [`LogContext`](../../api/sdk/logger.md#logcontext) of each line;
  - calling the app's logger safely;
  - collapsing repeats of a problem;
  - holding lines written while the thread is paused, and writing them after the pause.
- Does not own:
  - what is logged and at which level: the [debugger](debugger.md) and the [connector](connector.md);
  - keeping secrets out of messages: each call site passes URLs as origin and path only, and never the token or a
    captured value ([ADR 0006](../../adr/0006-authenticate-to-the-hub-with-a-bearer-token.md),
    [ADR 0012](../../adr/0012-redact-secrets-by-name-inside-the-sdk.md)).
- Constraints:
  - Never throws and never rejects. A logger method that throws is ignored; a returned promise gets a no-op
    `catch`, so a failing async logger cannot end the process with an unhandled rejection.
  - A line below the level costs one comparison. Code on the pause and send paths asks `enabled(level)` before it
    builds a message.
  - Memory is bounded: 100 collapse windows and 100 held lines.
  - One timer, unref'd and running only while a collapse window is open.
  - Calls the app's logger synchronously; it does not buffer or retry. The default `console` writes to stdout and
    stderr, which are synchronous for files and terminals; the default level and collapsing keep that rare.
  - Imports only Node built-ins and no other SDK module, so it moves with the connector if the connector becomes
    its own package.

## Interactions

```text
┌───────────┐  log(level, key, message, context)  ┌──────────────────────────────┐ warn(message, context) ┌────────────┐
│ Debugger  │ ───────────────────────────────────▶│            Logger            │ ─────────────────────▶ │ App logger │
└───────────┘  hold(), release()                  │ level filter · collapsing    │                        │ or console │
┌───────────┐ ───────────────────────────────────▶│ pause hold · safe call       │                        └────────────┘
│ Connector │  log(level, key, message, context)  └──────────────────────────────┘
└───────────┘
```

The logger lives in `packages/sdk/src/logger/`. The debugger creates one and hands it to the connector it creates
through an internal field marked with `Symbol.for("probex.logger")`, so one logger serves both and the ES module
and CommonJS builds recognize each other's. A `HubConnector` created by the app builds its own from its options.

Levels:

- `error` — ProbeX cannot do its job until something outside it changes: an invalid URL, a rejected token, the
  debugger stopping itself.
- `warn` — a problem ProbeX recovers from, or one that loses data: a reconnect, dropped messages, an invalid option
  replaced by its default.
- `info` — the lifecycle: started, stopped, turned off by `PROBEX_ENABLED`.
- `debug` — details for diagnosing ProbeX itself: an unknown message type, how a breakpoint was resolved.

## Key flows

### Resolving the logger

1. Until `run()`, the debugger's logger writes to `console` at the level of `PROBEX_LOG_LEVEL`, or `warn`. A
   `configure()` call that sets `logger` or `logLevel` applies them first, so its own warnings already use them.
2. `run()` resolves both like every option: the value from `configure()`, then `PROBEX_LOG_LEVEL`, then `warn`. See
   [ADR 0003](../../adr/0003-configure-the-connector-from-options-then-env.md). While the debugger runs,
   `configure()` logs a warning to the current logger and changes nothing.
3. `new HubConnector(options)` resolves them the same way in its constructor, unless the debugger handed it a
   logger.
4. An invalid `logLevel` or `PROBEX_LOG_LEVEL` logs a warning and `warn` is used. A `logger` without the four
   methods logs a warning to `console`, and `console` is used. The warnings carry the component of the caller that
   set the options: `debugger` for `configure()` and `run()`, `connector` for `new HubConnector()`. Before any
   options are set, the warning about `PROBEX_LOG_LEVEL` carries the logger's owner and goes to `console`. Like
   every line, these warnings are written only when the resolved level lets `warn` through.
5. `PROBEX_LOG_LEVEL` takes the level names exactly; an empty value counts as unset. An invalid value is reported
   once per logger, however often the options are set.

### Writing a line

1. A call site passes the level, a fixed key naming the problem, a message and the context fields it has.
2. A line below the level is dropped at once.
3. A repeat inside an open collapse window is counted and dropped, see [Collapsing repeats](#collapsing-repeats).
4. The message becomes `[probex] <component>: <message>`. For a passed logger, every `%` in it is doubled, so text
   from outside the SDK, such as error messages and URL paths, cannot make a logger that formats `%s` or `%o`
   swallow the context into the message or drop it.
5. The context always has `component`. An error becomes `{ name, message, code, stack }`, because JSON output turns
   an `Error` into `{}`. All values are plain and serializable.
6. While the thread is paused, the line is held, see [Holding lines during a pause](#holding-lines-during-a-pause).
7. Otherwise the app logger's method for the level is called with the message and the context. The default
   `console` prints the message only, without doubling `%`: given one argument, it formats nothing.

### Collapsing repeats

1. A problem is identified by the call site's key, the `breakpointId` and the error's `code`, so a different
   breakpoint or error code is logged in full.
2. Its first occurrence is logged in full and opens a 60 s window. Repeats inside the window are only counted.
3. When the window ends with repeats, one line at the same level says `(repeated N times in 60 s)`, with `count`
   in the context. A window without repeats ends silently. The next occurrence is logged in full again.
4. At most 100 windows are open. Opening another ends the oldest early, with its summary line.

### Holding lines during a pause

1. The debugger calls `hold()` when its `Debugger.paused` handler starts and `release()` in its `finally`, so the
   thread is never paused while the app's logger runs, also when the debugger stops itself during the pause.
2. Lines written in between are queued. At 100, the oldest is dropped and counted.
3. `release()` writes the queued lines with `setImmediate`, after the thread resumes, then one warning with the
   number of dropped lines, if any.

### Flushing

1. `probex.stop()` and `HubConnector.close()` flush the logger before they resolve: queued lines and the summaries
   of open windows are written, and the timer stops.
2. Lines written later, such as warnings about calls after `close()`, are still logged.

## Decisions

- [0003. Configure the connector from options, then env](../../adr/0003-configure-the-connector-from-options-then-env.md)
- [0014. Pass SDK logs as a full message and a context](../../adr/0014-pass-sdk-logs-as-a-full-message-and-a-context.md)
- [0015. Filter SDK logs by level before the app's logger](../../adr/0015-filter-sdk-logs-by-level-before-the-apps-logger.md)
