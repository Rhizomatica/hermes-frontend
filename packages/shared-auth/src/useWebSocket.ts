'use client';

import { useContext, createContext } from 'react';

/**
 * A single topic event pushed by the station (`hermes.v1` `event` frame):
 * `{ type: "event", topic, seq, ts, snapshot, data }`.
 */
export interface WsTopicEvent {
  topic: string;
  seq: number;
  ts: string;
  snapshot: boolean;
  data: unknown;
}

/**
 * The `hello` frame the station sends immediately after the WebSocket upgrade.
 */
export interface WsHello {
  protocol: string;
  service: string;
  version: string;
  role: string;
  user?: unknown;
  locale?: string;
  topics?: string[];
  commands?: string[];
  limits?: Record<string, unknown>;
}

export type WebSocketState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface WebSocketContextValue {
  /** ADR-002 4-state machine. */
  connectionState: WebSocketState;
  /** Derived boolean for backward-compatible consumers. */
  connected: boolean;
  /** The station's `hello` frame, once received. */
  hello: WsHello | null;
  lastEvent: WsTopicEvent | null;
  /**
   * Subscribe to one topic. Sends a `subscribe` frame to the station for the
   * first subscriber and an `unsubscribe` frame when the last subscriber is
   * removed. The handler receives the topic's `event` data envelope.
   */
  subscribe: (topic: string, handler: (event: WsTopicEvent) => void) => () => void;
  /**
   * Run a `hermes.v1` command and resolve with the reply's `data`. Rejects if
   * the station answers `ok: false` (with the reply's error message) or if the
   * socket is not connected.
   */
  sendCommand: (cmd: string, args?: unknown) => Promise<unknown>;
}

export const WebSocketContext = createContext<WebSocketContextValue | null>(null);

/**
 * useWebSocket — consumes the WebSocket context.
 *
 * During server-side rendering (build time), returns a stub value
 * since no WebSocket connection exists on the server.
 *
 * @throws if used outside WebSocketProvider at runtime (client-side)
 */
export function useWebSocket(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext);

  // Server-side rendering — return stub
  if (typeof window === 'undefined') {
    return {
      connectionState: 'disconnected',
      connected: false,
      hello: null,
      lastEvent: null,
      subscribe: () => () => {},
      sendCommand: async () => undefined,
    };
  }

  if (!ctx) {
    throw new Error('useWebSocket must be used within <WebSocketProvider>');
  }

  return ctx;
}