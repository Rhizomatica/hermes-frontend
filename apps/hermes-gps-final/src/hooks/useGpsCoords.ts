'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '@hermes/shared-auth';
import type { GpsPosition, GpsFix } from '@hermes/api';

/**
 * ServerState<T> for GPS coordinate data with real-time updates.
 *
 * Consumes gps.position + gps.fix WebSocket events.
 * Falls back to GET /api/gps polling when WS is disconnected.
 */
export interface GpsState {
  position: GpsPosition | null;
  fix: GpsFix | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  stale: boolean;
  refresh: () => Promise<void>;
}

const POLL_INTERVAL_MS = 30_000;
const STALE_THRESHOLD_MS = 60_000;

export function useGpsCoords(): GpsState {
  const { connected, subscribe } = useWebSocket();
  const [position, setPosition] = useState<GpsPosition | null>(null);
  const [fix, setFix] = useState<GpsFix | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [stale, setStale] = useState(false);

  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // Fetch position via REST
  const fetchPosition = useCallback(async () => {
    try {
      const res = await fetch('/api/gps');
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Unknown error' }));
        if (mountedRef.current) setError(err.message ?? 'Failed to fetch GPS data');
        return;
      }
      const json = (await res.json()) as { data: GpsPosition };
      if (mountedRef.current) {
        setPosition(json.data);
        setLastUpdated(new Date());
        setStale(false);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch GPS data');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // WebSocket subscriptions
  useEffect(() => {
    if (!connected) return;

    const unsubPosition = subscribe('gps.position', (event) => {
      if (!mountedRef.current) return;
      const pos = event.payload as unknown as GpsPosition;
      setPosition(pos);
      setLastUpdated(new Date());
      setStale(false);
      setLoading(false);
      setError(null);
    });

    const unsubFix = subscribe('gps.fix', (event) => {
      if (!mountedRef.current) return;
      const f = event.payload as unknown as GpsFix;
      setFix(f);
    });

    return () => {
      unsubPosition();
      unsubFix();
    };
  }, [connected, subscribe]);

  // REST polling fallback when WS disconnected
  useEffect(() => {
    if (connected) {
      // Clear polling when WS is connected
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
      return;
    }

    // Start polling when WS disconnected (deferred to avoid sync setState)
    const id = setTimeout(() => {
      fetchPosition();
      pollInterval.current = setInterval(fetchPosition, POLL_INTERVAL_MS);
    }, 0);

    return () => {
      clearTimeout(id);
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
    };
  }, [connected, fetchPosition]);

  // Staleness check
  useEffect(() => {
    if (!lastUpdated) return;
    const timer = setTimeout(() => {
      if (mountedRef.current) setStale(true);
    }, STALE_THRESHOLD_MS);
    return () => clearTimeout(timer);
  }, [lastUpdated]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchPosition();
  }, [fetchPosition]);

  return { position, fix, loading, error, lastUpdated, stale, refresh };
}