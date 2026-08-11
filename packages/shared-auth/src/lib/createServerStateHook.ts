'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ServerState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const inFlightRequests = new Map<string, Promise<unknown>>();

export function createServerStateHook<T>(cacheKey: string, fetcher: () => Promise<T>) {
  return function useServerState(): ServerState<T> {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const existing = inFlightRequests.get(cacheKey);
        if (existing) {
          setData((await existing) as T);
          setLoading(false);
          return;
        }
        const promise = fetcher();
        inFlightRequests.set(cacheKey, promise);
        setData(await promise);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      } finally {
        inFlightRequests.delete(cacheKey);
        setLoading(false);
      }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    return { data, loading, error, refresh: fetchData };
  };
}