export const PROTOCOL_VERSION = 1;

export const CLOSE_CODES = {
  protocolError: 4400,
  incompatibleVersion: 4426,
} as const;

export type ConnectorStatus = "connecting" | "connected" | "disconnected" | "closed";

export interface Connector {
  connect(): void;
  send(message: Message): void;
  onMessage(handler: (message: Message) => void): () => void;
  onStatus(handler: (status: ConnectorStatus) => void): () => void;
  close(): Promise<void>;
}

// `Batch` is a frame around messages, not a message: it is left out so a batch cannot nest
export type Message = Hello | Welcome | Breakpoints | BreakpointStatus | Snapshot;

export interface Hello {
  version: typeof PROTOCOL_VERSION;
  type: "hello";
  instanceId: string;
  service?: string;
  labels: Record<string, string>;
  hostname: string;
  pid: number;
  sdk: { name: string; version: string };
  runtime: { name: string; version: string };
}

export interface Welcome {
  version: typeof PROTOCOL_VERSION;
  type: "welcome";
}

export interface Batch {
  version: typeof PROTOCOL_VERSION;
  type: "batch";
  messages: Message[];
}

export interface Breakpoints {
  version: typeof PROTOCOL_VERSION;
  type: "breakpoints";
  breakpoints: Breakpoint[];
}

export interface Breakpoint {
  id: string;
  file: string;
  line: number;
  limits?: CaptureLimits;
}

export interface CaptureLimits {
  maxDepth?: number;
  maxItems?: number;
  maxStringLength?: number;
}

export interface BreakpointStatus {
  version: typeof PROTOCOL_VERSION;
  type: "breakpointStatus";
  breakpointId: string;
  status: "pending" | "active" | "rateLimited" | "error";
  message?: string;
}

export interface Snapshot {
  version: typeof PROTOCOL_VERSION;
  type: "snapshot";
  breakpointId: string;
  time: number;
  stack: StackFrame[];
  variables: Variable[];
  truncated?: boolean;
}

export interface StackFrame {
  function: string;
  file: string;
  line: number;
  column: number;
}

export interface Variable {
  name: string;
  value: Value;
}

export type Value =
  | { type: "undefined" }
  | { type: "null" }
  | { type: "boolean"; value: boolean }
  | { type: "number"; value: number | "NaN" | "Infinity" | "-Infinity" | "-0" }
  | { type: "bigint"; value: string }
  | { type: "symbol"; value: string }
  | { type: "string"; value: string; length: number }
  | { type: "function"; name: string }
  | { type: "date"; value: string }
  | { type: "error"; className: string; message: string; stack?: string }
  | { type: "object"; className: string; properties?: Variable[]; truncated?: boolean }
  | { type: "array"; length: number; items?: Value[] }
  | { type: "set"; size: number; items?: Value[] }
  | { type: "map"; size: number; entries?: { key: Value; value: Value }[] }
  | { type: "accessor" }
  | { type: "circular" }
  | { type: "redacted" }
  | { type: "unavailable"; reason: string };
