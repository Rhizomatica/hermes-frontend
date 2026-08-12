'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GpsPosition } from '@hermes/api';

/**
 * ServerState<T> for GPS position history.
 *
 * Fetches historical GPS positions from GET /api/gps/history and
 * appends new positions as they arrive via a callback.
 */
export interface GpsHistoryState {
  /** Array of positions from oldest to newest (up to 500 points) */
  history: GpsPosition[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Append a new position to the history trail */
  appendPosition: (pos: GpsPosition) => void;
}

const MAX_POINTS = 500;

const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Hook to fetch and manage GPS position history.
 *
 * Fetches history from /api/gps/history on mount and exposes
 * appendPosition to add new live positions to the trail.
 * Capped at 500 points, evicts oldest when limit exceeded.
 *
 * @example
 * const { history, appendPosition, refresh } = useGpsHistory();
 * // When new position arrives:
 * appendPosition({ latitude: -23.45, longitude: -46.78, ... });
 */
export function useGpsHistory(): GpsHistoryState {
  const [history, setHistory] = useState<GpsPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    const cacheKey = 'gpsHistory';

    try {
      const existing = inFlightRequests.get(cacheKey);
      if (existing) {
        const cached = (await existing) as GpsPosition[];
        setHistory(cached);
        return;
      }

      const promise = fetch('/api/gps/history')
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(err.message ?? 'Failed to fetch history');
          }
          const json = (await res.json()) as { data: GpsPosition[] };
          return json.data ?? [];
        });

      inFlightRequests.set(cacheKey, promise);

      const result = await promise;
      // Reverse to get oldest-first ordering
      setHistory([...result].reverse());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch history');
    } finally {
      inFlightRequests.delete(cacheKey);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const appendPosition = useCallback((pos: GpsPosition) => {
    setHistory((prev) => {
      const next = [...prev, pos];
      if (next.length > MAX_POINTS) {
        return next.slice(next.length - MAX_POINTS);
      }
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    await fetchHistory();
  }, [fetchHistory]);

  return { history, loading, error, refresh, appendPosition };
}