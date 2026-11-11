'use client';

import { useEffect, useRef, useState } from 'react';
import type { Beacon } from '@hermes/api';

export interface StationNameState {
  /** The station's callsign, or null when unset/unavailable. */
  callsign: string | null;
  loading: boolean;
}

/**
 * useStationName — reads the station's callsign for display in the GPS menu.
 *
 * The daemon does not (yet) send the station identity in the `hello` frame,
 * and `GET /system` is still spec-only. The implemented source is
 * `GET /gps/beacon`, whose `callsign` field is the station's own callsign.
 *
 * @example
 * const { callsign } = useStationName();
 * // callsign === "PU2UIT" | null
 */
export function useStationName(): StationNameState {
  const [callsign, setCallsign] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    fetch('/api/gps/beacon')
      .then((res) =>
        res.ok ? (res.json() as Promise<Beacon>) : Promise.reject(new Error('unavailable')),
      )
      .then((beacon) => {
        const value = beacon.callsign?.trim();
        if (mountedRef.current) setCallsign(value || null);
      })
      .catch(() => {
        // Best-effort: leave null when the beacon can't be read.
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { callsign, loading };
}