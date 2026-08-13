'use client';

import { useContext, createContext } from 'react';

export interface WebSocketEvent {
  type: string;
  payload: Record<string, unknown>;
}

export interface WebSocketContextValue {
  connected: boolean;
  lastEvent: WebSocketEvent | null;
  subscribe: (eventType: string, handler: (event: WebSocketEvent) => void) => () => void;
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
      connected: false,
      lastEvent: null,
      subscribe: () => () => {},
    };
  }

  if (!ctx) {
    throw new Error('useWebSocket must be used within <WebSocketProvider>');
  }

  return ctx;
}