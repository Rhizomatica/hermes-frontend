'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { filterConversation } from '@hermes/api';
import type { Message } from '@hermes/api';
import { useWebSocket } from '@hermes/shared-auth';

/**
 * Tri-state chat data result: the merged message list plus the sets of
 * message IDs the local station sent and that have been synced via UUCP.
 */
export interface ChatDataState {
  messages: Message[];
  sentIds: Set<number>;
  syncedIds: Set<number>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Module-level cache for stale-while-revalidate and in-flight dedup.
 *
 * Keyed by the resource identity (merged messages). Each entry caches the
 * last known payload so a remount can render immediately before refetching.
 */
const cache = new Map<string, { data: ChatPayload; fetchedAt: number }>();
const inFlight = new Map<string, Promise<ChatPayload>>();

interface ChatPayload {
  messages: Message[];
  sentIds: number[];
  syncedIds: number[];
}

const CACHE_KEY = 'chat:messages';
const STALE_AFTER_MS = 30_000;

async function fetchChatPayload(): Promise<ChatPayload> {
  const [msgRes, sentRes, uulsRes] = await Promise.all([
    fetch('/api/messages'),
    fetch('/api/messages/sent'),
    fetch('/api/sys/uuls'),
  ]);

  const response: ChatPayload = { messages: [], sentIds: [], syncedIds: [] };

  if (msgRes.ok) {
    const json = (await msgRes.json()) as { data: Message[] };
    response.messages = Array.isArray(json.data) ? json.data : [];
  }

  if (sentRes.ok) {
    const sentData = (await sentRes.json()) as { data: Message[] } | Message[];
    const list = Array.isArray(sentData)
      ? sentData
      : (sentData as { data: Message[] }).data;
    response.sentIds = (list ?? []).map((m) => m.id);
  }

  if (uulsRes.ok) {
    const uulsData = (await uulsRes.json()) as
      | { data: Array<{ messageId?: number }> }
      | Array<{ messageId?: number }>;
    const list = Array.isArray(uulsData)
      ? uulsData
      : (uulsData as { data: Array<{ messageId?: number }> }).data;
    const pending = new Set(
      (list ?? [])
        .filter((e) => typeof e.messageId === 'number')
        .map((e) => e.messageId as number),
    );
    response.syncedIds = response.sentIds.filter((id) => !pending.has(id));
  }

  return response;
}

/**
 * useChatData — fetches merged messages and sync deltas, with real-time WS
 * updates and a stale-while-revalidate module cache.
 *
 * @param station  Optional station canonical key to filter the message list.
 * @param aliasMap Optional alias map used when `station` is provided.
 * @returns ChatDataState with messages, sentIds, syncedIds, loading, error,
 *          and refresh.
 *
 * @example
 * const { messages, sentIds, loading, error, refresh } = useChatData('estacao3', aliasMap);
 */
export function useChatData(
  station?: string,
  aliasMap: Map<string, string> = new Map(),
): ChatDataState {
  const { subscribe } = useWebSocket();
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [sentIds, setSentIds] = useState<Set<number>>(new Set());
  const [syncedIds, setSyncedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stationRef = useRef(station);
  stationRef.current = station;
  const aliasMapRef = useRef(aliasMap);
  aliasMapRef.current = aliasMap;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Deduplicate concurrent requests
      const existing = inFlight.get(CACHE_KEY);
      let payload = existing ? await existing : null;

      if (!payload) {
        const promise = fetchChatPayload();
        inFlight.set(CACHE_KEY, promise);
        payload = await promise;
      }

      cache.set(CACHE_KEY, { data: payload, fetchedAt: Date.now() });

      setAllMessages(payload.messages);
      setSentIds(new Set(payload.sentIds));
      setSyncedIds(new Set(payload.syncedIds));
    } catch {
      setError('Could not load messages.');
    } finally {
      inFlight.delete(CACHE_KEY);
      setLoading(false);
    }
  }, []);

  // Initial load: serve cached data (stale-while-revalidate) then refetch.
  useEffect(() => {
    const cached = cache.get(CACHE_KEY);
    if (cached && Date.now() - cached.fetchedAt < STALE_AFTER_MS) {
      setAllMessages(cached.data.messages);
      setSentIds(new Set(cached.data.sentIds));
      setSyncedIds(new Set(cached.data.syncedIds));
      setLoading(false);
      return;
    }
    refresh();
  }, [refresh]);

  // Real-time: new message arrives
  useEffect(() => {
    const unsubNew = subscribe('message.new', (event) => {
      const msg = event.payload as unknown as Message;
      setAllMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    const unsubDelivered = subscribe('message.delivered', (event) => {
      const id = (event.payload as { id?: number }).id;
      if (typeof id === 'number') {
        setSyncedIds((prev) => new Set(prev).add(id));
      }
    });

    return () => {
      unsubNew();
      unsubDelivered();
    };
  }, [subscribe]);

  const messages = station
    ? filterConversation(allMessages, station, aliasMapRef.current)
    : allMessages;

  return { messages, sentIds, syncedIds, loading, error, refresh };
}