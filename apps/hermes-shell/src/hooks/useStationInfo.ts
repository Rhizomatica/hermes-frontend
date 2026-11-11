'use client';

import { useEffect, useRef, useState } from 'react';

interface SystemVersions {
  backend?: string;
  mercury?: string;
  os?: string;
}

interface SystemResponse {
  hostname?: string;
  uucp_name?: string;
  callsign?: string | null;
  domain?: string;
  versions?: SystemVersions;
  uptime_s?: number;
}

export interface StationInfo {
  /** Local station name (the daemon's UUCP name). */
  stationName: string | null;
  /** Mail domain the station belongs to. */
  domain: string | null;
  /** Running backend version reported by the daemon. */
  version: string | null;
  /** Seconds since the station started. */
  uptime: number | null;
  /** The station's own callsign. */
  callsign: string | null;
  loading: boolean;
}

/**
 * useStationInfo — reads the local station's identity for the shell dashboard.
 *
 * Sources `GET /api/system`, which proxies the hermes-radio-daemon's
 * `GET /api/v2/system` (station name, callsign, domain, versions and uptime).
 * The request is best-effort: missing fields resolve to null so the UI can
 * render a neutral fallback without blocking the app selector.
 *
 * @example
 * const info = useStationInfo();
 * // info.stationName === 'pu2uit-3', info.callsign === 'PU2UIT'
 */
export function useStationInfo(): StationInfo {
  const [info, setInfo] = useState<StationInfo>({
    stationName: null,
    domain: null,
    version: null,
    uptime: null,
    callsign: null,
    loading: true,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    fetch('/api/system')
      .then((res) => (res.ok ? (res.json() as Promise<SystemResponse>) : null))
      .then((system) => {
        if (!mountedRef.current) return;
        setInfo({
          stationName: system?.uucp_name?.trim() || null,
          domain: system?.domain?.trim() || null,
          version: system?.versions?.backend?.trim() || null,
          uptime: typeof system?.uptime_s === 'number' ? system.uptime_s : null,
          callsign: system?.callsign?.trim() || null,
          loading: false,
        });
      })
      .catch(() => {
        if (mountedRef.current) setInfo((prev) => ({ ...prev, loading: false }));
      });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return info;
}
