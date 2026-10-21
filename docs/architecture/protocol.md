# Protocol

## Purpose

`@probex/protocol` is the contract between the SDK, custom connectors, the hub and custom hubs: the messages they exchange, the protocol
version and the `Connector` interface. Each side builds against it without depending on the others.

## Boundaries

- Owns:
  - the message types the SDK and a hub exchange through a connector;
  - `PROTOCOL_VERSION` and the other constants both ends of the wire must agree on;
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
┌──────────────────┐
│   @probex/sdk    │──┐
└──────────────────┘  │
┌──────────────────┐  │
│ Custom connector │──┤
└──────────────────┘  │  types, constants  ┌──────────────────┐
┌──────────────────┐  ├───────────────────▶│ @probex/protocol │
│       Hub        │──┤                    └──────────────────┘
└──────────────────┘  │
┌──────────────────┐  │
│    Custom hub    │──┘
└──────────────────┘
```

`@probex/sdk` (its debugger and default connector), custom connectors, the hub and custom hubs written by users
import `@probex/protocol`. None of them imports another to get a protocol type or constant.

## Key flows

### Adding a type or constant

1. Check whether both ends have to agree on it: the SDK and a hub, or the SDK and a custom connector.
2. If they do, it goes into `@probex/protocol`. If not, it stays in the package that owns it, however many packages
   use it.

### Changing the protocol

1. An addition that old peers can ignore, such as a new optional field, keeps `PROTOCOL_VERSION`.
2. Renaming, removing or retyping anything a peer reads bumps `PROTOCOL_VERSION`.
3. Either change updates `docs/api/protocol.md` in the same pull request.

## Decisions

- [0001. Keep the protocol in its own package](../adr/0001-keep-the-protocol-in-its-own-package.md)
