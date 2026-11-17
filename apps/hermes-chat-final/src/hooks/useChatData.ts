'use client';

import { useCallback, useEffect, useState } from 'react';
import { filterConversation, type Message } from '@hermes/api';
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

function readFreshCache(): ChatPayload | null {
  const cached = cache.get(CACHE_KEY);
  if (!cached || Date.now() - cached.fetchedAt >= STALE_AFTER_MS) return null;
  return cached.data;
}

async function loadChatPayload(): Promise<ChatPayload> {
  let promise = inFlight.get(CACHE_KEY);
  if (!promise) {
    promise = fetchChatPayload();
    inFlight.set(CACHE_KEY, promise);
  }
  try {
    const payload = await promise;
    cache.set(CACHE_KEY, { data: payload, fetchedAt: Date.now() });
    return payload;
  } finally {
    inFlight.delete(CACHE_KEY);
  }
}

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
  const [initialCache] = useState(readFreshCache);
  const [allMessages, setAllMessages] = useState<Message[]>(initialCache?.messages ?? []);
  const [sentIds, setSentIds] = useState<Set<number>>(() => new Set(initialCache?.sentIds));
  const [syncedIds, setSyncedIds] = useState<Set<number>>(() => new Set(initialCache?.syncedIds));
  const [loading, setLoading] = useState(initialCache === null);
  const [error, setError] = useState<string | null>(null);

  const applyPayload = useCallback((payload: ChatPayload) => {
    setAllMessages(payload.messages);
    setSentIds(new Set(payload.sentIds));
    setSyncedIds(new Set(payload.syncedIds));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      applyPayload(await loadChatPayload());
    } catch {
      setError('Could not load messages.');
    } finally {
      setLoading(false);
    }
  }, [applyPayload]);

  // Initial load: cached data was applied above; only fetch when it is stale.
  useEffect(() => {
    if (readFreshCache()) return;
    let cancelled = false;
    loadChatPayload()
      .then((payload) => {
        if (cancelled) return;
        applyPayload(payload);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Could not load messages.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyPayload]);

  // Real-time: a message arrived or its state changed. The daemon's `messages`
  // topic (hermes.v1) carries `{ change, message }`; `created`/`received`
  // append a message. (This topic is not yet implemented by the daemon, so it
  // stays silent until it lands; UUCP sync deltas keep coming from REST.)
  useEffect(() => {
    const unsubscribe = subscribe('messages', (event) => {
      const data = event.data as { change?: string; message?: Message } | undefined;
      const msg = data?.message;
      if (!msg) return;
      if (data?.change === 'created' || data?.change === 'received') {
        setAllMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [subscribe]);

  const messages = station
    ? filterConversation(allMessages, station, aliasMap)
    : allMessages;

  return { messages, sentIds, syncedIds, loading, error, refresh };
}