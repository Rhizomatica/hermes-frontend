'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  WebSocketContext,
  type WebSocketContextValue,
  type WebSocketState,
  type WsHello,
  type WsTopicEvent,
} from './useWebSocket';

export type { WebSocketContextValue, WebSocketState, WsHello, WsTopicEvent };

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8080/api/v2/ws';
const WS_PROTOCOLS = ['hermes.v1'];
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;

interface ServerReply {
  type: 'reply';
  id: string;
  ok: boolean;
  data?: unknown;
  error?: { code: string; message: string };
}

interface ServerEventFrame {
  type: 'event';
  topic: string;
  seq: number;
  ts: string;
  snapshot?: boolean;
  data: unknown;
}

/**
 * WebSocketProvider — connects to the hermes-radio-daemon station API
 * (`hermes.v1` at `/api/v2/ws`).
 *
 * Implements the daemon's `hermes.v1` contract (api-ws.yaml):
 *   - `hermes.v1` subprotocol (the daemon refuses anything else with 426)
 *   - server-driven `hello` (role, user, locale, topics, commands) and a
 *     `heartbeat` every 5 s
 *   - topic subscriptions via `subscribe`/`unsubscribe` frames, answered by
 *     `event` frames (`{ type: "event", topic, seq, ts, snapshot, data }`)
 *   - commands via `cmd` frames, answered by exactly one `reply`
 *   - reconnect with exponential backoff + jitter (1s → 30s); on reconnect the
 *     provider re-subscribes every currently-watched topic
 */
export function WebSocketProvider({ children }: { children: ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<(event: WsTopicEvent) => void>>>(new Map());
  const pendingRef = useRef<
    Map<string, { resolve: (value: unknown) => void; reject: (err: Error) => void }>
  >(new Map());
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempt = useRef(0);
  const disposedRef = useRef(false);
  const idCounter = useRef(0);
  const [state, setState] = useState<WebSocketState>('connecting');
  const [hello, setHello] = useState<WsHello | null>(null);
  const [lastEvent, setLastEvent] = useState<WsTopicEvent | null>(null);

  const nextId = useCallback(() => {
    idCounter.current += 1;
    return String(idCounter.current);
  }, []);

  const sendJson = useCallback((frame: unknown) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(frame));
  }, []);

  const resubscribeAll = useCallback(() => {
    for (const topic of handlersRef.current.keys()) {
      sendJson({ type: 'subscribe', id: nextId(), topics: [topic] });
    }
  }, [sendJson, nextId]);

  const connect = useCallback(() => {
    if (disposedRef.current) return;

    setState((prev) => (prev === 'connected' ? 'connecting' : prev));
    setHello(null);
    const ws = new WebSocket(WS_URL, WS_PROTOCOLS);

    ws.onopen = () => {
      if (disposedRef.current) {
        ws.close();
        return;
      }
      reconnectAttempt.current = 0;
      setState('connected');
      // Restore any subscriptions established before the (re)connection.
      resubscribeAll();
    };

    ws.onmessage = (msg: MessageEvent) => {
      if (typeof msg.data !== 'string') return; // binary spectrum frames are out of scope here
      let frame: unknown;
      try {
        frame = JSON.parse(msg.data);
      } catch {
        return; // ignore malformed frames
      }

      const typed = frame as { type?: string };
      if (!typed?.type) return;

      switch (typed.type) {
        case 'hello':
          setHello(frame as WsHello);
          return;
        case 'heartbeat':
          return; // station clock; nothing to do client-side
        case 'reply': {
          const reply = frame as ServerReply;
          const pending = pendingRef.current.get(reply.id);
          if (!pending) return;
          pendingRef.current.delete(reply.id);
          if (reply.ok) pending.resolve(reply.data);
          else pending.reject(new Error(reply.error?.message ?? reply.error?.code ?? 'Command failed'));
          return;
        }
        case 'event': {
          const ev = frame as ServerEventFrame;
          const topicEvent: WsTopicEvent = {
            topic: ev.topic,
            seq: ev.seq,
            ts: ev.ts,
            snapshot: ev.snapshot === true,
            data: ev.data,
          };
          setLastEvent(topicEvent);
          const handlers = handlersRef.current.get(ev.topic);
          if (handlers) handlers.forEach((h) => h(topicEvent));
          return;
        }
        default:
          return;
      }
    };

    ws.onclose = () => {
      // Reject any in-flight commands; their transport is gone.
      for (const [, pending] of pendingRef.current) {
        pending.reject(new Error('WebSocket closed before the reply arrived'));
      }
      pendingRef.current.clear();
      if (disposedRef.current) return;
      setState('reconnecting');
      const delay = nextBackoffDelay(reconnectAttempt.current);
      reconnectAttempt.current += 1;
      reconnectTimeout.current = setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();

    wsRef.current = ws;
  }, [resubscribeAll]);

  useEffect(() => {
    disposedRef.current = false;
    connect();
    return () => {
      disposedRef.current = true;
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback(
    (topic: string, handler: (event: WsTopicEvent) => void) => {
      const handlers = handlersRef.current;
      const isFirst = !handlers.has(topic) || handlers.get(topic)?.size === 0;
      if (!handlers.has(topic)) handlers.set(topic, new Set());
      handlers.get(topic)?.add(handler);

      if (isFirst) {
        sendJson({ type: 'subscribe', id: nextId(), topics: [topic] });
      }

      return () => {
        const set = handlers.get(topic);
        if (!set) return;
        set.delete(handler);
        if (set.size === 0) {
          handlers.delete(topic);
          sendJson({ type: 'unsubscribe', id: nextId(), topics: [topic] });
        }
      };
    },
    [sendJson, nextId],
  );

  const sendCommand = useCallback(
    (cmd: string, args?: unknown) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return Promise.reject(new Error('WebSocket is not connected'));
      }
      const id = nextId();
      return new Promise<unknown>((resolve, reject) => {
        pendingRef.current.set(id, { resolve, reject });
        ws.send(JSON.stringify({ type: 'cmd', id, cmd, args: args ?? {} }));
      });
    },
    [nextId],
  );

  const value = useMemo<WebSocketContextValue>(
    () => ({
      connectionState: state,
      connected: state === 'connected',
      hello,
      lastEvent,
      subscribe,
      sendCommand,
    }),
    [state, hello, lastEvent, subscribe, sendCommand],
  );

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

/** Exponential backoff (1s → 30s) with ±20% jitter, per ADR-002. */
function nextBackoffDelay(attempt: number): number {
  const base = Math.min(BACKOFF_BASE_MS * 2 ** attempt, BACKOFF_MAX_MS);
  const jitter = base * 0.2 * (Math.random() * 2 - 1); // ±20%
  return Math.max(0, Math.round(base + jitter));
}