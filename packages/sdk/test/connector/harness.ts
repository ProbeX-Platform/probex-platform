// Drives one HubConnector in a test: records its status changes and every line it logs, at debug level.

import type { ConnectorStatus } from "@probex-platform/protocol";
import { vi } from "vitest";

import type { FakeHubs } from "./fake-hub.js";
import { HubConnector, type HubConnectorOptions } from "../../src/connector/index.js";
import type { LogContext, Logger } from "../../src/logger/index.js";

/** One call of the app logger. */
export interface LoggedLine {
  level: keyof Logger;
  message: string;
  context: LogContext;
}

/** A connector under test with what it reported. */
export interface Harness {
  connector: HubConnector;
  statuses: readonly ConnectorStatus[];
  lines: readonly LoggedLine[];
  /** Resolves when `status` is next reported. */
  nextStatus: (status: ConnectorStatus) => Promise<void>;
  /** The messages logged at `level`, without the `[probex] connector: ` prefix. */
  messagesAt: (level: keyof Logger) => string[];
}

const PREFIX = "[probex] connector: ";

const createRecordingLogger = (lines: LoggedLine[]): Logger => {
  const record =
    (level: keyof Logger) =>
    (message: string, context: LogContext): void => {
      lines.push({ level, message, context });
    };
  return { debug: record("debug"), info: record("info"), warn: record("warn"), error: record("error") };
};

/** Creates a connector that is closed after the test; its status handler is the first one added. */
export const createHarness = (hubs: FakeHubs, options: HubConnectorOptions): Harness => {
  const statuses: ConnectorStatus[] = [];
  const lines: LoggedLine[] = [];
  const waiters: Array<{ status: ConnectorStatus; resolve: () => void }> = [];
  const connector = hubs.track(
    new HubConnector({ logLevel: "debug", logger: createRecordingLogger(lines), ...options }),
  );
  connector.onStatus((status) => {
    statuses.push(status);
    for (const waiter of waiters.filter((candidate) => candidate.status === status)) {
      waiters.splice(waiters.indexOf(waiter), 1);
      waiter.resolve();
    }
  });

  return {
    connector,
    statuses,
    lines,
    nextStatus: (status) =>
      new Promise((resolve) => {
        waiters.push({ status, resolve });
      }),
    messagesAt: (level) => lines.filter((line) => line.level === level).map((line) => line.message.replace(PREFIX, "")),
  };
};

/** Parses a frame the hub received. */
export const parseFrame = (frame: string): Record<string, unknown> => {
  // The connector only ever sends JSON objects; a test fails on anything else
  return JSON.parse(frame) as Record<string, unknown>;
};

/** Fakes the timers the connector uses, and `Date` so a test can measure a wait in fake time. */
export const useConnectorFakeTimers = (): void => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
};

/** Runs fake time up to the next timer, which must be the reconnect timer, and returns how long it waited. */
export const advanceToReconnect = async (): Promise<number> => {
  const before = Date.now();
  await vi.advanceTimersToNextTimerAsync();
  return Date.now() - before;
};

/** Lets ws finish what it scheduled with process.nextTick and real I/O callbacks already due. */
export const settle = (): Promise<void> =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });
