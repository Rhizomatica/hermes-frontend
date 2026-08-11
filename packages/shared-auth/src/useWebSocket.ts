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

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function useWebSocket(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocket must be used within <WebSocketProvider>');
  return ctx;
}