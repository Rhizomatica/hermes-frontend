'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { WebSocketContext, type WebSocketContextValue, type WebSocketEvent, type WebSocketState } from './useWebSocket';

export { type WebSocketContextValue, type WebSocketEvent, type WebSocketState };

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8081';
const WS_PROTOCOLS = ['hermes-v1'];
const HEARTBEAT_INTERVAL_MS = 30_000;
const PONG_TIMEOUT_MS = 10_000;
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;

/**
 * WebSocketProvider — connects to hermes-radio-daemon (ADR-002).
 *
 * Implements the ADR-002 contract:
 *   - `hermes-v1` subprotocol
 *   - heartbeat: send `ping` every 30s; abandon if no `pong` within 10s
 *   - reconnect with exponential backoff + jitter (1s → 30s)
 *   - 4-state connection state machine
 *   - `send(eventType, payload)` for outbound messages (future phases)
 */
export function WebSocketProvider({ children }: { children: ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<(event: WebSocketEvent) => void>>>(new Map());
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pongTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempt = useRef(0);
  const disposedRef = useRef(false);
  const [state, setState] = useState<WebSocketState>('connecting');
  const [lastEvent, setLastEvent] = useState<WebSocketEvent | null>(null);

  const connect = useCallback(() => {
    if (disposedRef.current) return;

    setState((prev) => (prev === 'connected' ? 'connecting' : prev));
    const ws = new WebSocket(WS_URL, WS_PROTOCOLS);

    ws.onopen = () => {
      if (disposedRef.current) {
        ws.close();
        return;
      }
      reconnectAttempt.current = 0;
      setState('connected');
      startHeartbeat(ws);
    };

    ws.onmessage = (msg: MessageEvent) => {
      if (msg.data === 'pong') {
        clearPongTimeout();
        return;
      }
      try {
        const event = JSON.parse(msg.data as string) as WebSocketEvent;
        setLastEvent(event);
        const handlers = handlersRef.current.get(event.type);
        if (handlers) handlers.forEach((h) => h(event));
      } catch {
        /* ignore malformed */
      }
    };

    ws.onclose = () => {
      cleanupTimers();
      if (disposedRef.current) return;
      setState('reconnecting');
      const delay = nextBackoffDelay(reconnectAttempt.current);
      reconnectAttempt.current += 1;
      reconnectTimeout.current = setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    disposedRef.current = false;
    connect();
    return () => {
      disposedRef.current = true;
      cleanupTimers();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [connect]);

  function startHeartbeat(ws: WebSocket) {
    heartbeatInterval.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send('ping');
      // If no pong arrives within PONG_TIMEOUT_MS, consider the link dead.
      pongTimeout.current = setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) ws.close();
      }, PONG_TIMEOUT_MS);
    }, HEARTBEAT_INTERVAL_MS);
  }

  function clearPongTimeout() {
    if (pongTimeout.current) {
      clearTimeout(pongTimeout.current);
      pongTimeout.current = null;
    }
  }

  function cleanupTimers() {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
    clearPongTimeout();
  }

  const subscribe = useCallback(
    (eventType: string, handler: (event: WebSocketEvent) => void) => {
      const handlers = handlersRef.current;
      if (!handlers.has(eventType)) handlers.set(eventType, new Set());
      handlers.get(eventType)?.add(handler);
      return () => {
        handlers.get(eventType)?.delete(handler);
      };
    },
    [],
  );

  const send = useCallback((eventType: string, payload: unknown) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: eventType, payload }));
    }
  }, []);

  const value = useMemo<WebSocketContextValue>(
    () => ({
      connectionState: state,
      connected: state === 'connected',
      lastEvent,
      subscribe,
      send,
    }),
    [state, lastEvent, subscribe, send],
  );

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

/** Exponential backoff (1s → 30s) with ±20% jitter, per ADR-002. */
function nextBackoffDelay(attempt: number): number {
  const base = Math.min(BACKOFF_BASE_MS * 2 ** attempt, BACKOFF_MAX_MS);
  const jitter = base * 0.2 * (Math.random() * 2 - 1); // ±20%
  return Math.max(0, Math.round(base + jitter));
}