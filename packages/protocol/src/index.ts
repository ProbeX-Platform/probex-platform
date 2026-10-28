import type { Message } from "./v1.js";

export type * from "./v1.js";

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
