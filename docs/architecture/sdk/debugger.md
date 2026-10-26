# Debugger

## Purpose

The debugger is the part of the SDK that sets breakpoints in the running app and captures snapshots without
stopping it. It turns the hub's breakpoint list into V8 breakpoints, reads the variables at each hit within strict
limits, redacts secrets and sends them to the hub through a connector. How to use it: [API](../../api/sdk/debugger.md).

## Boundaries

- Owns:
  - the lifecycle of [`probex`](../../api/sdk/debugger.md#probex): options, `run()`, `stop()` and the connector it
    creates;
  - the in-process inspector session and the V8 breakpoints in it;
  - matching repository paths and TypeScript lines to loaded scripts through source maps;
  - capturing snapshots and cutting values to [`CaptureLimits`](../../api/protocol.md#capturelimits);
  - redacting secrets by name before a value is read;
  - rate limits, the pause budget and the status of each breakpoint.
- Does not own:
  - moving messages, buffering and reconnects: the [connector](connector.md);
  - message types: the [protocol](../protocol.md);
  - which breakpoints exist: the hub.
- Constraints:
  - Never throws into, crashes or blocks the host app. Every handler is wrapped in try/catch; an unexpected error is
    logged and the debugger stops itself while the app keeps running.
  - Every pause ends in `Debugger.resume`, also after an error. If resuming fails, `Debugger.disable` resumes the
    thread and the debugger stops itself.
  - A pause lasts at most 10 ms, the app spends at most 20 ms per second paused, and a snapshot is at most 64 KiB.
  - Without breakpoints the inspector's `Debugger` domain is off, so V8 runs the app as if ProbeX were not there.
  - Runs no user code: getters are never called and nothing is evaluated.
  - A redacted value is never read from V8, so it is not in the snapshot, the logs or the SDK's memory. Only the
    host app sets the redaction rules; the hub cannot change them.
  - Debugs the main thread only; worker threads are not debugged.
  - Resumes every pause it did not cause, including `debugger` statements, so another debugger attached to the
    process does not work while breakpoints are set.
  - Memory is bounded: 100 breakpoints, source maps up to 8 MiB each, decoded only for scripts that have
    breakpoints and dropped with them.
  - Reads source maps inline (`data:` URLs) or from `.map` files next to the scripts; bundles, where many sources
    map into one script, are not supported.
  - Imports only `@probex-platform/protocol`, the connector module and Node built-ins; source maps are decoded by
    its own VLQ decoder.
  - Never keeps the host process alive: every timer is unref'd.

## Interactions

```text
                                                         resolve file:line     ┌────────────┐
┌───────────┐   breakpoints     ┌────────────────────┐ ──────────────────────▶ │ SourceMaps │
│           │ ────────────────▶ │                    │                         └────────────┘
│           │                   │                    │
│           │ ◀──────────────── │    Breakpoints     │     allow hit?          ┌─────────────┐
│           │ breakpointStatus  │                    │ ──────────────────────▶ │ RateLimiter │
│           │                   └────────────────────┘                         └─────────────┘
│           │                     │       │         ▲
│           │             capture │       │         │
│ Connector │                     ▼       │ set,    │
│           │  snapshot   ┌─────────┐     │ remove, │ scriptParsed,
│           │ ◀────────── │ Capture │     │ resume  │ paused
│           │             └─────────┘     │         │
│           │    getProperties ▼          ▼         │
│           │                 ┌────────────────────────┐   Debugger.*, Runtime.*  ┌────┐
│           │                 │    InspectorSession    │ ───────────────────────▶ │ V8 │
└───────────┘                 └────────────────────────┘ ◀─────────────────────── └────┘
                                                           scriptParsed, paused
```

The parts live in `packages/sdk/src/debugger/`:

- `Debugger` — the `probex` object. Resolves the options, creates the connector and the parts below, hands
  `breakpoints` messages to `Breakpoints` and sends what they produce. It is not running, running or stopping.
- `Breakpoints` — holds the latest list from the hub, the V8 breakpoint of each entry and its status, and handles
  every pause.
- `SourceMaps` — finds the script and position for a repository path and line, and the original position for a
  script position.
- `RateLimiter` — token buckets per breakpoint and per process, and the pause budget.
- `Capture` — reads the stack and variables of a paused frame into a [`Snapshot`](../../api/protocol.md#snapshot),
  and redacts secrets by name as it goes.
- `InspectorSession` — wraps `node:inspector`. On the main thread, `post` answers synchronously, also while the
  thread is paused; failures come back as results and are never thrown.

## Key flows

### Starting

1. `run()` with `enabled` false logs one info line and does nothing.
2. It resolves the options: the value from `configure()`, then the environment, then the default. Without a hub URL
   and without a custom connector it logs an error and does not start.
3. It creates a `HubConnector` or takes the custom one, subscribes to its messages and calls `connect()`.
4. It connects the inspector session; the `Debugger` domain stays off until there are breakpoints.
5. If any step fails, an error is logged, what was started is stopped and the debugger is not running.

### Applying breakpoints

1. A [`breakpoints`](../../api/protocol.md#breakpoints) message arrives. Invalid entries and those after the 100th
   get status `error`. When an `id` appears more than once, the first entry is used and the others get status
   `error`.
2. Entries are compared by `id` with the current ones. An entry with the same `file`, `line` and `limits` is left
   as it is, with no V8 calls. Removed and changed entries lose their V8 breakpoint; new and changed entries are
   resolved.
3. The first non-empty list turns the `Debugger` domain on: V8 reports every loaded script with `scriptParsed`, and
   later ones as they load. An empty list turns it off.
4. Resolving: candidate scripts are those whose file name, without extension, equals the entry's. For a candidate
   with a source map the entry's `file` is compared with the map's sources, otherwise with the script's path. The
   source whose path ends with the most segments of `file` wins; a tie gives status `error`, no candidate gives
   `pending`.
5. The line is mapped to the first generated position of that original line, or of the next line that has one, and
   the breakpoint is set by script and position. V8 moves it to the next position that has code. Entries that
   resolve to the same script and position share one V8 breakpoint, which is removed with the last of them.
6. After each message, the status of every listed breakpoint is sent as a
   [`breakpointStatus`](../../api/protocol.md#breakpointstatus), a control message.
7. A `pending` breakpoint is resolved again on every `scriptParsed` with a matching file name.

### Loading a source map

1. On `scriptParsed`, the script's id, URL and `sourceMapURL` are recorded; nothing is read.
2. When a breakpoint needs the map, a `data:` URL is decoded in place; any other URL is resolved against the
   script's path and read with `node:fs/promises`.
3. A map larger than 8 MiB, unreadable or invalid gives the breakpoint status `error` with the reason and logs a
   warning.
4. The mappings are decoded into indexes from original line to generated position and back, kept while the script
   has breakpoints.

### Capturing a snapshot

1. V8 reaches a breakpoint and pauses the thread; `Debugger.paused` reaches the session synchronously.
2. A pause without one of our breakpoints in `hitBreakpoints` is resumed at once.
3. The rate limiter checks each entry on the hit V8 breakpoint: an entry is allowed if it has a token (10 per
   second), the process has one (50 per second) and the pause budget (20 ms per second) is not spent. With no entry
   allowed the thread resumes. An entry out of tokens gets status `rateLimited` and `active` again when its bucket
   refills; once every entry on a V8 breakpoint is out of tokens, the V8 breakpoint is removed until one refills, so
   a hot line stops pausing.
4. `Capture` reads up to 20 frames of the stack, mapped back to original positions where a decoded map exists, then
   `this` and the scopes of the innermost frame with synchronous `Runtime.getProperties` calls, depth first, within
   the largest limits of the allowed entries. At 10 ms or 64 KiB it stops: what is left is `unavailable` and the
   snapshot is `truncated`. A name that matches the redaction rules, see [Redacting secrets](#redacting-secrets),
   gets the value `redacted` and its value is not read.
5. The thread resumes, and the pause time is charged to the budget. One pause serves every entry on the breakpoint.
6. For each allowed entry, the capture is cut to that entry's own limits, without V8 calls, and sent as a
   [`snapshot`](../../api/protocol.md#snapshot) through the connector as a data message.

### Redacting secrets

1. At `run()` the rules are resolved once: the built-in names, plus the names from `redact`, then
   `PROBEX_REDACT`. The app adds names; it cannot remove the built-in ones.
2. Names are normalized before matching: lowercased, with `_`, `-` and `.` removed, so `api_key`, `API-KEY` and
   `apiKey` are all `apikey`.
3. A name matches when its normalized form contains a normalized rule, so `dbPassword` matches `password`. A
   false match hides a harmless value; a missed one leaks a secret, so matching errs towards hiding.
4. Rules apply to every name in the tree at any depth: variables, `this`, object properties and map entries whose
   key is a string. Array items have no name and are not matched.
5. A matching name keeps its place with the value `{ type: "redacted" }`; its value and children are never read.
6. Built-in names: `password`, `passwd`, `pwd`, `secret`, `token`, `apikey`, `accesskey`, `privatekey`,
   `credential`, `authorization`, `cookie`, `session`, `jwt`, `bearer`, `signature`.
7. String contents are not scanned: a secret inside a value under a harmless name, such as a URL with a password,
   is captured as is.

### Losing the connection

1. Breakpoints stay set and snapshots wait in the connector's data buffer, which drops the oldest when full.
2. After the reconnect the hub sends the full list again, and it is applied like any other.

### Stopping

1. `stop()` removes every V8 breakpoint, turns the `Debugger` domain off, disconnects the inspector session and
   unsubscribes from the connector.
2. It closes the connector it created, which sends buffered snapshots for up to `closeTimeoutMs`; a custom
   connector is left open.
3. The debugger is not running; `run()` can start it again.
4. An unexpected error in any part logs an error and runs the same steps, so the app keeps running without the
   debugger.

## Decisions

- [0003. Configure the connector from options, then env](../../adr/0003-configure-the-connector-from-options-then-env.md)
- [0007. Deliver messages to the hub at most once](../../adr/0007-deliver-messages-to-the-hub-at-most-once.md)
- [0010. Send the full breakpoint set on every change](../../adr/0010-send-the-full-breakpoint-set-on-every-change.md)
- [0011. Encode snapshot values as a nested tree](../../adr/0011-encode-snapshot-values-as-a-nested-tree.md)
- [0012. Redact secrets by name inside the SDK](../../adr/0012-redact-secrets-by-name-inside-the-sdk.md)
