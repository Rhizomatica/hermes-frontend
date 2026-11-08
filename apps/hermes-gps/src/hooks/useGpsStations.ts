'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GpsStation } from '@hermes/api';

/**
 * ServerState<T> for the known stations and their last-known positions.
 *
 * Backs the station dots on the map: fetches every station this one can reach
 * from `GET /api/gps/stations` (which proxies the daemon's
 * `GET /api/v2/gps/stations`).
 */
export interface GpsStationsState {
  /** Known stations with their last-known positions (null when unknown). */
  stations: GpsStation[];
  /** Initial fetch in flight. */
  loading: boolean;
  /** Last failure message, or null. */
  error: string | null;
  /** Reload the station list. */
  refresh: () => Promise<void>;
}

const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Hook to fetch the stations this one can reach, for plotting on the map.
 *
 * @example
 * const { stations } = useGpsStations();
 * <MapView stations={stations} />
 */
export function useGpsStations(): GpsStationsState {
  const [stations, setStations] = useState<GpsStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Track mounted state (re-asserted on mount to survive StrictMode remounts).
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const cacheKey = 'gpsStations';
    const existing = inFlightRequests.get(cacheKey);
    const promise =
      existing ??
      fetch('/api/gps/stations').then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            (data as { message?: string }).message ?? 'Failed to fetch stations',
          );
        }
        const list = (data as { data?: GpsStation[] }).data;
        return Array.isArray(list) ? list : [];
      });
    if (!existing) inFlightRequests.set(cacheKey, promise);

    try {
      const result = (await promise) as GpsStation[];
      if (mountedRef.current) {
        setStations(result);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stations');
      }
    } finally {
      inFlightRequests.delete(cacheKey);
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // Initial load (deferred to avoid a synchronous setState in the effect body).
  useEffect(() => {
    const id = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(id);
  }, [refresh]);

  return { stations, loading, error, refresh };
}
