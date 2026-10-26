# Protocol

## Purpose

`@probex-platform/protocol` is the contract between the SDK, custom connectors, the hub and custom hubs: the messages they exchange, the protocol
version and the `Connector` interface. Each side builds against it without depending on the others.

## Boundaries

- Owns:
  - the message types the SDK and a hub exchange through a connector, including the `hello` → `welcome` handshake
    and the `batch` frame;
  - `PROTOCOL_VERSION`, `CLOSE_CODES` and the other constants both ends of the wire must agree on;
  - the `Connector` interface that the default connector and custom connectors implement;
  - the public data types carried in messages, such as breakpoints and snapshots.
- Does not own:
  - moving messages: the [connector](sdk/connector.md);
  - capturing snapshots and managing breakpoints: the [debugger](sdk/debugger.md);
  - helpers and the internal types of one component, even when several packages use them: they stay in the package
    that owns them.
- Constraints:
  - Types and constants only: no runtime logic, no side effects, no dependencies, no Node-only APIs.
  - Every export is public API of ProbeX and is documented in `docs/api/`.
  - Changes are backward-compatible or bump `PROTOCOL_VERSION`.

## Interactions

```text
┌──────────────────────┐
│ @probex-platform/sdk │──┐
└──────────────────────┘  │
┌──────────────────────┐  │
│   Custom connector   │──┤
└──────────────────────┘  │  types, constants  ┌───────────────────────────┐
┌──────────────────────┐  ├───────────────────▶│ @probex-platform/protocol │
│         Hub          │──┤                    └───────────────────────────┘
└──────────────────────┘  │
┌──────────────────────┐  │
│      Custom hub      │──┘
└──────────────────────┘
```

`@probex-platform/sdk` (its debugger and default connector), custom connectors, the hub and custom hubs written by users
import `@probex-platform/protocol`. None of them imports another to get a protocol type or constant.

## Key flows

### Adding a type or constant

1. Check whether both ends have to agree on it: the SDK and a hub, or the SDK and a custom connector.
2. If they do, it goes into `@probex-platform/protocol`. If not, it stays in the package that owns it, however many packages
   use it.

### Opening a session

1. The connector sends `hello` with `PROTOCOL_VERSION` and the instance's identity as the first frame.
2. The hub replies `welcome`, or closes with `CLOSE_CODES.incompatibleVersion` or `CLOSE_CODES.protocolError`.
3. After `welcome` both sides exchange other messages; the hub starts with the full breakpoint state. The steps and
   timeouts are in the [protocol API](../api/protocol.md#hello).

### Changing the protocol

1. An addition that old peers can ignore, such as a new optional field, keeps `PROTOCOL_VERSION`.
2. Renaming, removing or retyping anything a peer reads bumps `PROTOCOL_VERSION`.
3. Either change updates `docs/api/protocol.md` in the same pull request.

## Decisions

- [0001. Keep the protocol in its own package](../adr/0001-keep-the-protocol-in-its-own-package.md)
- [0004. Use handler functions in the Connector interface](../adr/0004-use-handler-functions-in-the-connector-interface.md)
- [0005. Batch and rate-limit messages in the connector](../adr/0005-batch-and-rate-limit-messages-in-the-connector.md)
- [0007. Deliver messages to the hub at most once](../adr/0007-deliver-messages-to-the-hub-at-most-once.md)
- [0009. Run the hub handshake in the connector](../adr/0009-run-the-hub-handshake-in-the-connector.md)
- [0010. Send the full breakpoint set on every change](../adr/0010-send-the-full-breakpoint-set-on-every-change.md)
- [0011. Encode snapshot values as a nested tree](../adr/0011-encode-snapshot-values-as-a-nested-tree.md)
- [0012. Redact secrets by name inside the SDK](../adr/0012-redact-secrets-by-name-inside-the-sdk.md)
