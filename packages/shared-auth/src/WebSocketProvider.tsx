'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { WebSocketContext, type WebSocketContextValue, type WebSocketEvent } from './useWebSocket';

export { type WebSocketContextValue, type WebSocketEvent };

/**
 * WebSocketProvider — connects to hermes-radio-daemon (ADR-002).
 * Reconnects with exponential backoff (1s→30s max).
 */
export function WebSocketProvider({ children }: { children: ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<(event: WebSocketEvent) => void>>>(new Map());
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempt = useRef(0);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WebSocketEvent | null>(null);

  const connect = useCallback(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8081';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnected(true);
      reconnectAttempt.current = 0;
    };

    ws.onmessage = (msg: MessageEvent) => {
      try {
        const event = JSON.parse(msg.data as string) as WebSocketEvent;
        setLastEvent(event);
        const handlers = handlersRef.current.get(event.type);
        if (handlers) handlers.forEach((h) => h(event));
      } catch { /* ignore malformed */ }
    };

    ws.onclose = () => {
      setConnected(false);
      const delay = Math.min(1000 * 2 ** reconnectAttempt.current, 30_000);
      reconnectAttempt.current += 1;
      reconnectTimeout.current = setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();
    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback(
    (eventType: string, handler: (event: WebSocketEvent) => void) => {
      const handlers = handlersRef.current;
      if (!handlers.has(eventType)) handlers.set(eventType, new Set());
      handlers.get(eventType)?.add(handler);
      return () => { handlers.get(eventType)?.delete(handler); };
    },
    [],
  );

  const value = useMemo<WebSocketContextValue>(
    () => ({ connected, lastEvent, subscribe }),
    [connected, lastEvent, subscribe],
  );

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}