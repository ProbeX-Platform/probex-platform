// Version 1 pins `version: 1` rather than `typeof PROTOCOL_VERSION`, so a later version bump cannot retype it

// `Batch` is a frame around messages, not a message: it is left out so a batch cannot nest
export type Message = Hello | Welcome | Breakpoints | BreakpointStatus | Snapshot;

export interface Hello {
  version: 1;
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
  version: 1;
  type: "welcome";
}

export interface Batch {
  version: 1;
  type: "batch";
  messages: Message[];
}

export interface Breakpoints {
  version: 1;
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
  version: 1;
  type: "breakpointStatus";
  breakpointId: string;
  status: "pending" | "active" | "rateLimited" | "error";
  message?: string;
}

export interface Snapshot {
  version: 1;
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
  | { type: "map"; size: number; entries?: Array<{ key: Value; value: Value }> }
  | { type: "accessor" }
  | { type: "circular" }
  | { type: "redacted" }
  | { type: "unavailable"; reason: string };
