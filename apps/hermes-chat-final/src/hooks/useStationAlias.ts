'use client';

import { useCallback, useEffect, useState } from 'react';
import { stationId } from '@hermes/api';
import type { Station } from '@hermes/api';

export interface StationAliasResult {
  aliasMap: Map<string, string>;
  getAlias: (station: string) => string | null;
}

/**
 * useStationAlias — loads the station alias map from `GET /api/stations`.
 *
 * The map keys are bare station IDs (via `stationId()`) and values are the
 * user-friendly alias. Used to canonicalize station addresses across the
 * conversation list and chat views.
 *
 * @example
 * const { aliasMap, getAlias } = useStationAlias();
 * getAlias('PU2UIT-3') // => 'estacao3'
 */
export function useStationAlias(): StationAliasResult {
  const [aliasMap, setAliasMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    fetch('/api/stations')
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { data: Station[] } | null) => {
        if (cancelled || !json || !Array.isArray(json.data)) return;
        const map = new Map<string, string>();
        for (const s of json.data) {
          if (s.alias) map.set(stationId(s.name), s.alias);
        }
        setAliasMap(map);
      })
      .catch(() => {
        // Alias resolution is best-effort; leave the map empty on failure.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const getAlias = useCallback(
    (station: string): string | null =>
      aliasMap.get(stationId(station)) ?? null,
    [aliasMap],
  );

  return { aliasMap, getAlias };
}