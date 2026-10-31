import { assertType, describe, expectTypeOf, it } from "vitest";

import type { LogContext, Logger, LogLevel } from "./index.js";

type Write = (message: string, context: LogContext) => void;

// A stand-in for pino's methods, so the Usage example of docs/api/sdk/logger.md compiles without pino
type PinoMethod = (obj: object, msg: string) => void;
declare const log: Record<"debug" | "info" | "warn" | "error", PinoMethod>;

describe("logger types", () => {
  it("defines Logger as the four methods of docs/api/sdk/logger.md", () => {
    expectTypeOf<Logger>().toEqualTypeOf<{ debug: Write; info: Write; warn: Write; error: Write }>();
  });

  it("defines LogContext as in docs/api/sdk/logger.md", () => {
    expectTypeOf<LogContext>().toEqualTypeOf<{
      component: string;
      breakpointId?: string;
      error?: { name: string; message: string; code?: string; stack?: string };
      count?: number;
    }>();
  });

  it("defines LogLevel as the four line levels and silent", () => {
    expectTypeOf<LogLevel>().toEqualTypeOf<"debug" | "info" | "warn" | "error" | "silent">();
  });

  it("accepts console as a Logger", () => {
    assertType<Logger>(console);
  });

  it("accepts the pino adapter from the Usage example", () => {
    // The adapter in docs/api/sdk/logger.md#usage, with block bodies as the lint rules require
    assertType<Logger>({
      debug: (message, context) => {
        log.debug(context, message);
      },
      info: (message, context) => {
        log.info(context, message);
      },
      warn: (message, context) => {
        log.warn(context, message);
      },
      error: (message, context) => {
        log.error(context, message);
      },
    });
  });

  it("rejects a Logger without one of the four methods", () => {
    const write: Write = () => undefined;

    // @ts-expect-error error is required
    assertType<Logger>({ debug: write, info: write, warn: write });
  });

  it("rejects a LogContext without a component", () => {
    // @ts-expect-error component is required
    assertType<LogContext>({ breakpointId: "bp-1" });
  });

  it("rejects a level outside LogLevel", () => {
    // @ts-expect-error "verbose" is not a level
    assertType<LogLevel>("verbose");
  });
});
