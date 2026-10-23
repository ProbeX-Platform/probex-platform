# Connector

## Purpose

`HubConnector` is the SDK's default [`Connector`](../../api/protocol.md#connector): it carries protocol messages
between the [debugger](debugger.md) in the host app and the hub over one WebSocket. The SDK creates it from its own
config; developers create it themselves only to tune it. How to use it: [API](../../api/sdk/connector.md).

## Boundaries

- Owns:
  - the WebSocket to the hub: TLS, the bearer token in the upgrade request, reconnects with backoff, liveness pings;
  - the session on each connection: the `hello` → `welcome` handshake and the protocol version check;
  - outgoing messages: serialization, the control queue and the data buffer, batching and the rate limit;
  - handing incoming messages and status changes to handlers;
  - logging its own problems.
- Does not own:
  - message types, `PROTOCOL_VERSION` and close codes: the [protocol](../protocol.md);
  - what is sent and what an incoming message means, including re-applying breakpoints after a reconnect: the
    [debugger](debugger.md);
  - process signals and shutdown: the host app calls `close()`, directly or through the SDK.
- Constraints:
  - Never throws into the host app and `close()` never rejects. Every problem is logged: failures at `error`,
    problems the connector recovers from at `warn`. The first occurrence of a problem is logged in full; repeats
    within 60 s are collapsed into one line with a count.
  - Never blocks the event loop: `send()` costs one `JSON.stringify` of the message; all I/O is asynchronous.
  - Never keeps the host process alive: the socket and every timer are unref'd.
  - Memory is bounded: the data buffer by `buffer.maxMessages` and `buffer.maxBytes`, the control queue by 100
    messages, incoming frames by 1 MiB.
  - Imports only `@probex-platform/protocol`, `ws` and Node built-ins, never other SDK modules, so it can move to
    its own package.
  - TLS certificates are always verified; custom CAs come from `NODE_EXTRA_CA_CERTS`. The token is never logged and
    never sent over `ws://` to a host other than loopback.
  - WebSocket compression is off: it costs CPU and memory in the host app.
  - Connects to the hub directly; HTTP(S) proxies (`HTTPS_PROXY`) are not supported yet.
  - Delivery is at most once: a message lost with a dropped socket is not resent.

## Interactions

```text
              send(message)          ┌────────────────────────────┐   hello, messages, batches   ┌─────┐
┌──────────┐ ───────────────────────▶│        HubConnector        │─────────────────────────────▶│     │
│ Debugger │                         │                            │                              │ Hub │
└──────────┘ ◀───────────────────────│ session · queues · batcher │◀─────────────────────────────│     │
              onMessage, onStatus    │ rate limit · reconnect     │   welcome, messages, close   └─────┘
                                     └────────────────────────────┘
                                                   │
                                                   │ warn, error
                                                   ▼
                                              ┌────────┐
                                              │ Logger │
                                              └────────┘
```

The debugger sees only the [`Connector`](../../api/protocol.md#connector) interface. On the wire every frame is one
JSON protocol message or a [`Batch`](../../api/protocol.md#batch) of them.

## Key flows

### Connecting

1. `connect()` resolves the URL and returns. No URL, a URL that is not `ws://` or `wss://`, or a token with `ws://`
   to a non-loopback host: an error is logged and the status stays `disconnected`.
2. The status becomes `connecting`. The connector opens the WebSocket with `Authorization: Bearer <token>` when a
   token is set, and unrefs the socket.
3. Once open, it sends [`hello`](../../api/protocol.md#hello) as the first frame: protocol version, service, labels,
   instance id, hostname, pid, SDK and Node versions.
4. The hub replies [`welcome`](../../api/protocol.md#welcome). The status becomes `connected` and the queued
   messages start to flow.
5. The hub sends the full breakpoint state; the debugger applies it. This happens after every connect, so nothing
   has to survive a disconnect.
6. On failure the status becomes `disconnected` and the next attempt waits `reconnect.minDelayMs`, doubling with
   jitter up to `reconnect.maxDelayMs`:
   - unreachable hub, TLS error or no `welcome` within 10 s: a warning;
   - HTTP 401 or 403 on the upgrade, or close code `incompatibleVersion` or `protocolError`: an error, and the next
     attempt waits `reconnect.maxDelayMs` at once. The connector keeps trying, so it recovers when the token or the
     hub is fixed.

### Sending a message

1. `send(message)` serializes the message once. If `JSON.stringify` throws, an error is logged and the message is
   dropped.
2. Data messages (snapshots, later logs) go to the data buffer. When it is full by `buffer.maxMessages` or
   `buffer.maxBytes`, the oldest data messages are dropped and a warning is logged.
3. All other messages are control messages (breakpoint status, errors) and go to the control queue, so a burst of
   snapshots cannot hide a breakpoint's status from the hub. Data never pushes them out; when 100 control messages
   are waiting, the oldest is dropped and an error is logged. A new message type is control unless the connector
   lists it as data.
4. While `connected`, the batcher takes control messages first, then data, until it reaches `batch.maxMessages` or
   `batch.maxBytes`, or `batch.flushIntervalMs` passes. A single message larger than `batch.maxBytes` is sent on
   its own.
5. The batch waits until the token bucket of `rateLimit.bytesPerSecond` allows it and the socket has less than
   `batch.maxBytes` unsent. One message goes as itself, several as a `batch` frame.
6. Messages already handed to the socket when it drops are lost.

### Receiving a message

1. A frame larger than 1 MiB closes the connection with an error; the connector reconnects.
2. A frame that is not valid JSON or has no `type` is logged as a warning and ignored.
3. A message with an unknown `type` is logged at `debug` and ignored, so older SDKs keep working with newer hubs.
4. Every other message goes to each `onMessage` handler. A handler that throws is logged; the others still run.

### Detecting a dead connection

1. While open, the connector sends a WebSocket ping every 15 s.
2. If nothing arrives from the hub within 10 s of a ping, it drops the socket with a warning and reconnects.

### Closing

1. `close()` stops reconnecting and pings, and sends queued messages for up to `closeTimeoutMs`.
2. It drops what is left with a warning that says how many, closes the socket with code 1000, sets the status to
   `closed` and resolves.
3. No handler is called after `close()` resolves; later `connect()` and `send()` calls log a warning and do nothing.

## Decisions

- [0002. Ship the default connector inside the SDK](../../adr/0002-ship-the-default-connector-inside-the-sdk.md)
- [0003. Configure the connector from options, then env](../../adr/0003-configure-the-connector-from-options-then-env.md)
- [0004. Use handler functions in the Connector interface](../../adr/0004-use-handler-functions-in-the-connector-interface.md)
- [0005. Batch and rate-limit messages in the connector](../../adr/0005-batch-and-rate-limit-messages-in-the-connector.md)
- [0006. Authenticate to the hub with a bearer token](../../adr/0006-authenticate-to-the-hub-with-a-bearer-token.md)
- [0007. Deliver messages to the hub at most once](../../adr/0007-deliver-messages-to-the-hub-at-most-once.md)
- [0008. Use WebSocket for the hub connection](../../adr/0008-use-websocket-for-the-hub-connection.md)
- [0009. Run the hub handshake in the connector](../../adr/0009-run-the-hub-handshake-in-the-connector.md)
