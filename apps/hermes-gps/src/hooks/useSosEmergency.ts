'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Beacon } from '@hermes/api';

/**
 * useSosEmergency — sets and clears the station's SOS (emergency) beacon
 * through the daemon's `/api/v2/gps/sos` REST endpoint, proxied by the
 * Next.js routes `/api/gps/sos` (POST/DELETE).
 *
 * On mount it reads the current beacon state (`GET /api/gps/beacon`) so an
 * already-active emergency is reflected. `sendSos` returns false (and sets
 * `error`) when the daemon refuses the request (e.g. 503 when the broadcast
 * plane is not running).
 */
export interface SosState {
  /** Current SOS emergency code (0 = none, 1-30 = active). */
  emergency: number;
  /** A sendSos request is in flight. */
  sending: boolean;
  /** A clearSos request is in flight. */
  clearing: boolean;
  /** Last failure message, or null. */
  error: string | null;
  /** Set the emergency code (default 1 = distress). Resolves to success. */
  sendSos: (code?: number) => Promise<boolean>;
  /** Clear the emergency. Resolves to success. */
  clearSos: () => Promise<boolean>;
}

export function useSosEmergency(): SosState {
  const [emergency, setEmergency] = useState(0);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Reflect an already-active SOS on load.
    fetch('/api/gps/beacon')
      .then((res) =>
        res.ok ? (res.json() as Promise<Beacon>) : Promise.reject(new Error('unavailable')),
      )
      .then((beacon) => {
        if (mountedRef.current) setEmergency(beacon.emergency ?? 0);
      })
      .catch(() => {
        // Best-effort; keep 0 (no active emergency) if the beacon can't be read.
      });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const sendSos = useCallback(async (code = 1) => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/gps/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => ({}))) as Beacon & {
        message?: string;
        detail?: string;
      };
      if (!res.ok) {
        const message = data.detail ?? data.message ?? `HTTP ${res.status}`;
        if (mountedRef.current) setError(message);
        return false;
      }
      if (mountedRef.current) setEmergency(data.emergency ?? code);
      return true;
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to send SOS');
      }
      return false;
    } finally {
      if (mountedRef.current) setSending(false);
    }
  }, []);

  const clearSos = useCallback(async () => {
    setClearing(true);
    setError(null);
    try {
      const res = await fetch('/api/gps/sos', { method: 'DELETE' });
      const data = (await res.json().catch(() => ({}))) as Beacon & {
        message?: string;
        detail?: string;
      };
      if (!res.ok) {
        const message = data.detail ?? data.message ?? `HTTP ${res.status}`;
        if (mountedRef.current) setError(message);
        return false;
      }
      if (mountedRef.current) setEmergency(0);
      return true;
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to clear SOS');
      }
      return false;
    } finally {
      if (mountedRef.current) setClearing(false);
    }
  }, []);

  return { emergency, sending, clearing, error, sendSos, clearSos };
}