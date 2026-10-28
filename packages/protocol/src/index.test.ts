import { describe, expect, expectTypeOf, it } from "vitest";

import * as protocol from "./index.js";
import {
  CLOSE_CODES,
  PROTOCOL_VERSION,
  type Batch,
  type Breakpoint,
  type BreakpointStatus,
  type Breakpoints,
  type CaptureLimits,
  type Connector,
  type ConnectorStatus,
  type Hello,
  type Message,
  type Snapshot,
  type StackFrame,
  type Value,
  type Variable,
  type Welcome,
} from "./index.js";

// A broken assertion here is a compile error, which the root `tsc -p .` in `pnpm verify` reports

type Handler<T> = (value: T) => void;

class MemoryConnector implements Connector {
  readonly sent: Message[] = [];
  private readonly messageHandlers = new Set<Handler<Message>>();
  private readonly statusHandlers = new Set<Handler<ConnectorStatus>>();

  connect(): void {
    this.emit(this.statusHandlers, "connected");
  }

  send(message: Message): void {
    this.sent.push(message);
  }

  onMessage(handler: Handler<Message>): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStatus(handler: Handler<ConnectorStatus>): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  receive(message: Message): void {
    this.emit(this.messageHandlers, message);
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- verbatim copy of the Usage example in docs/api/protocol.md
  async close(): Promise<void> {
    this.emit(this.statusHandlers, "closed");
    this.messageHandlers.clear();
    this.statusHandlers.clear();
  }

  private emit<T>(handlers: Set<Handler<T>>, value: T): void {
    for (const handler of handlers) {
      try {
        handler(value);
      } catch {
        // a failing handler must not stop the others
      }
    }
  }
}

describe("constants", () => {
  it("exports no runtime values besides the two constants", () => {
    expect(Object.keys(protocol).sort()).toEqual(["CLOSE_CODES", "PROTOCOL_VERSION"]);
  });

  it("sets the protocol version to the literal 1", () => {
    expectTypeOf<typeof PROTOCOL_VERSION>().toEqualTypeOf<1>();
    expect(PROTOCOL_VERSION).toBe(1);
  });

  it("sets the close codes to readonly literals", () => {
    expectTypeOf<typeof CLOSE_CODES>().toEqualTypeOf<{
      readonly protocolError: 4400;
      readonly incompatibleVersion: 4426;
    }>();
    expect(CLOSE_CODES).toEqual({ protocolError: 4400, incompatibleVersion: 4426 });
  });
});

describe("messages", () => {
  it("accepts the hello example of the API doc", () => {
    const hello: Hello = {
      version: PROTOCOL_VERSION,
      type: "hello",
      instanceId: crypto.randomUUID(),
      service: "checkout",
      labels: { region: "eu" },
      hostname: "checkout-7d9f",
      pid: 1,
      sdk: { name: "@probex-platform/sdk", version: "0.1.0" },
      runtime: { name: "node", version: process.versions.node },
    };

    expectTypeOf(hello).toExtend<Message>();
    expect(hello.type).toBe("hello");
  });

  it("accepts the welcome example of the API doc", () => {
    const welcome: Welcome = { version: PROTOCOL_VERSION, type: "welcome" };

    expectTypeOf(welcome).toExtend<Message>();
    expect(welcome.type).toBe("welcome");
  });

  it("accepts the batch example of the API doc", () => {
    const toBatch = (messages: Message[]): Batch => ({ version: PROTOCOL_VERSION, type: "batch", messages });

    expect(toBatch([{ version: PROTOCOL_VERSION, type: "welcome" }])).toEqual({
      version: 1,
      type: "batch",
      messages: [{ version: 1, type: "welcome" }],
    });
  });

  it("accepts the breakpoints example of the API doc", () => {
    const breakpoints: Breakpoints = {
      version: PROTOCOL_VERSION,
      type: "breakpoints",
      breakpoints: [{ id: "bp-1", file: "src/orders/checkout.ts", line: 42 }],
    };

    expectTypeOf(breakpoints).toExtend<Message>();
    expect(breakpoints.breakpoints).toHaveLength(1);
  });

  it("accepts the breakpoint and limits examples of the API doc", () => {
    const breakpoint: Breakpoint = {
      id: "bp-1",
      file: "src/orders/checkout.ts",
      line: 42,
      limits: { maxDepth: 2 },
    };
    const deep: CaptureLimits = { maxDepth: 5, maxItems: 50 };

    expect(breakpoint.limits).toEqual({ maxDepth: 2 });
    expect(deep).toEqual({ maxDepth: 5, maxItems: 50 });
  });

  it("accepts the breakpoint status example of the API doc", () => {
    const status: BreakpointStatus = {
      version: PROTOCOL_VERSION,
      type: "breakpointStatus",
      breakpointId: "bp-1",
      status: "active",
    };

    expectTypeOf(status).toExtend<Message>();
    expect(status.status).toBe("active");
  });

  it("reads a variable of the snapshot example of the API doc", () => {
    const total = (snapshot: Snapshot): Value | undefined =>
      snapshot.variables.find((variable) => variable.name === "total")?.value;
    const snapshot: Snapshot = {
      version: PROTOCOL_VERSION,
      type: "snapshot",
      breakpointId: "bp-1",
      time: 0,
      stack: [{ function: "checkout", file: "src/orders/checkout.ts", line: 42, column: 1 }],
      variables: [{ name: "total", value: { type: "number", value: 10 } }],
    };

    expectTypeOf(snapshot).toExtend<Message>();
    expect(total(snapshot)).toEqual({ type: "number", value: 10 });
  });

  it("accepts the value example of the API doc", () => {
    const order: Value = {
      type: "object",
      className: "Order",
      properties: [{ name: "id", value: { type: "string", value: "o-17", length: 4 } }],
    };

    expectTypeOf(order).toExtend<Value>();
    expect(order.type).toBe("object");
  });

  it("limits messages to the five documented types", () => {
    expectTypeOf<Message["type"]>().toEqualTypeOf<
      "hello" | "welcome" | "breakpoints" | "breakpointStatus" | "snapshot"
    >();
    expect(PROTOCOL_VERSION).toBe(1);
  });

  it("limits values to the eighteen documented kinds", () => {
    expectTypeOf<Value["type"]>().toEqualTypeOf<
      | "undefined"
      | "null"
      | "boolean"
      | "number"
      | "bigint"
      | "symbol"
      | "string"
      | "function"
      | "date"
      | "error"
      | "object"
      | "array"
      | "set"
      | "map"
      | "accessor"
      | "circular"
      | "redacted"
      | "unavailable"
    >();
    expect(PROTOCOL_VERSION).toBe(1);
  });

  it("accepts every kind of value", () => {
    const values: Value[] = [
      { type: "undefined" },
      { type: "null" },
      { type: "boolean", value: true },
      { type: "number", value: "-0" },
      { type: "bigint", value: "1" },
      { type: "symbol", value: "Symbol(a)" },
      { type: "string", value: "a", length: 1 },
      { type: "function", name: "f" },
      { type: "date", value: "2026-01-01T00:00:00.000Z" },
      { type: "error", className: "Error", message: "boom", stack: "at f" },
      { type: "object", className: "Object", truncated: true },
      { type: "array", length: 1, items: [{ type: "null" }] },
      { type: "set", size: 1, items: [{ type: "null" }] },
      { type: "map", size: 1, entries: [{ key: { type: "null" }, value: { type: "null" } }] },
      { type: "accessor" },
      { type: "circular" },
      { type: "redacted" },
      { type: "unavailable", reason: "maxDepth" },
    ];

    expect(values).toHaveLength(18);
  });

  it("round-trips a snapshot through JSON unchanged", () => {
    const frame: StackFrame = { function: "checkout", file: "src/orders/checkout.ts", line: 42, column: 7 };
    const variable: Variable = {
      name: "cart",
      value: {
        type: "map",
        size: 3,
        entries: [
          { key: { type: "string", value: "nan", length: 3 }, value: { type: "number", value: "NaN" } },
          { key: { type: "string", value: "zero", length: 4 }, value: { type: "number", value: "-0" } },
          {
            key: { type: "string", value: "order", length: 5 },
            value: {
              type: "object",
              className: "Order",
              properties: [{ name: "limit", value: { type: "number", value: "Infinity" } }],
            },
          },
        ],
      },
    };
    const snapshot: Snapshot = {
      version: PROTOCOL_VERSION,
      type: "snapshot",
      breakpointId: "bp-1",
      time: 1_700_000_000_000,
      stack: [frame],
      variables: [variable],
      truncated: true,
    };

    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it("accepts messages without their optional fields and with them", () => {
    const hello: Hello = {
      version: PROTOCOL_VERSION,
      type: "hello",
      instanceId: "i-1",
      labels: {},
      hostname: "h",
      pid: 1,
      sdk: { name: "@probex-platform/sdk", version: "0.1.0" },
      runtime: { name: "node", version: "22.0.0" },
    };
    const status: BreakpointStatus = {
      version: PROTOCOL_VERSION,
      type: "breakpointStatus",
      breakpointId: "bp-1",
      status: "error",
      message: "no code at or after line 42",
    };

    expect(hello.service).toBeUndefined();
    expect(status.message).toBe("no code at or after line 42");
  });

  it("rejects a hello without labels", () => {
    // @ts-expect-error labels is required
    const hello: Hello = {
      version: PROTOCOL_VERSION,
      type: "hello",
      instanceId: "i-1",
      hostname: "h",
      pid: 1,
      sdk: { name: "@probex-platform/sdk", version: "0.1.0" },
      runtime: { name: "node", version: "22.0.0" },
    };

    expect(hello.type).toBe("hello");
  });

  it("rejects a breakpoint without a line", () => {
    // @ts-expect-error line is required
    const breakpoint: Breakpoint = { id: "bp-1", file: "src/orders/checkout.ts" };

    expect(breakpoint.id).toBe("bp-1");
  });

  it("rejects a string value without its full length", () => {
    // @ts-expect-error length is required on a string value
    const value: Value = { type: "string", value: "a" };

    expect(value.type).toBe("string");
  });

  it("rejects a batch inside a batch", () => {
    const inner: Batch = { version: PROTOCOL_VERSION, type: "batch", messages: [] };
    // @ts-expect-error batches do not nest
    const outer: Batch = { version: PROTOCOL_VERSION, type: "batch", messages: [inner] };

    expect(outer.messages).toHaveLength(1);
  });

  it("rejects a message with a wrong type literal", () => {
    // @ts-expect-error "welcom" is not a message type
    const welcome: Welcome = { version: PROTOCOL_VERSION, type: "welcom" };

    expect(welcome.version).toBe(1);
  });

  it("rejects a message with a wrong version literal", () => {
    // @ts-expect-error version 2 is not the protocol version
    const welcome: Welcome = { version: 2, type: "welcome" };

    expect(welcome.type).toBe("welcome");
  });

  it("rejects a status outside the breakpoint states", () => {
    // @ts-expect-error "paused" is not a breakpoint state
    const status: BreakpointStatus["status"] = "paused";

    expect(status).toBe("paused");
  });

  it("rejects a batch inside a message", () => {
    // @ts-expect-error a batch is a frame, not a message
    const message: Message = { version: PROTOCOL_VERSION, type: "batch", messages: [] };

    expect(message.type).toBe("batch");
  });

  it("rejects an unknown value type", () => {
    // @ts-expect-error "regexp" is not a value type
    const value: Value = { type: "regexp" };

    expect(value.type).toBe("regexp");
  });
});

describe("Connector", () => {
  it("has exactly the documented methods", () => {
    expectTypeOf<Connector>().toEqualTypeOf<{
      connect(): void;
      send(message: Message): void;
      onMessage(handler: (message: Message) => void): () => void;
      onStatus(handler: (status: ConnectorStatus) => void): () => void;
      close(): Promise<void>;
    }>();
    expectTypeOf<ConnectorStatus>().toEqualTypeOf<"connecting" | "connected" | "disconnected" | "closed">();
    expect(PROTOCOL_VERSION).toBe(1);
  });

  it("is implemented by the MemoryConnector of the API doc", () => {
    const connector: Connector = new MemoryConnector();

    expect(connector).toBeInstanceOf(MemoryConnector);
  });
});
