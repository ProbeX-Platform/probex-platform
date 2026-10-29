# 0014. Pass SDK logs as a full message and a context

## Status

Accepted · 2026-10-29

## Context

The SDK reports its own problems to the app's logger. Apps should switch ProbeX to the logger they already use by
passing it as it is: `console`, pino and winston must work without wrapper code, and others with a few lines of
adapter. These loggers disagree on arguments: pino takes `(object, message)` and drops every argument after the
message; winston takes `(message, meta)` and merges the meta object; `console` prints whatever it gets. JSON output
turns an `Error` into `{}`.

## Decision

We call each `Logger` method with a message that is complete on its own as the first argument and a `LogContext` of
plain, serializable values as the second.

## Alternatives

- **Message only** — every logger works, but none gets structured fields, and adding a second argument later
  changes what every adapter receives.
- **Message and raw values, `(message, ...args)`** — pino drops the extra arguments, so the error behind a warning
  is lost, and winston's JSON output prints an `Error` as `{}`.
- **Context first, `(context, message)`** — native in pino, but `console` prints the object before the message and
  winston takes the object as the message.
- **Detect the logger's kind** — breaks on child loggers and wrappers, and every new logger needs SDK code.

## Consequences

- `console`, pino and winston work as passed; winston also gets the context as structured fields.
- pino drops the context; apps that want its fields add a four-line adapter, shown in the API docs.
- `%` in text from outside the SDK is doubled, so format-aware loggers neither swallow nor drop the context.
- `LogContext` gains fields only as optional ones, and `component` may get new values in a minor version.
- Methods are called synchronously; a returned promise is ignored and its rejection caught.
