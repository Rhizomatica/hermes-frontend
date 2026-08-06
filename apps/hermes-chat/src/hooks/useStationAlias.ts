import { useState, useEffect, useCallback } from "react";
import { stationId } from "@platform/utils";

interface UseStationAliasResult {
  aliasMap: Map<string, string>;
  getAlias: (station: string) => string | null;
}

export function useStationAlias(): UseStationAliasResult {
  const [aliasMap, setAliasMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    fetch("/api/stations")
      .then((r) => (r.ok ? r.json() : null))
      .then((list: { name: string; alias: string }[] | null) => {
        if (!Array.isArray(list)) return;
        const map = new Map<string, string>();
        for (const s of list) map.set(stationId(s.name), s.alias);
        setAliasMap(map);
      })
      .catch(() => {});
  }, []);

  const getAlias = useCallback(
    (station: string): string | null =>
      aliasMap.get(stationId(station)) ?? null,
    [aliasMap]
  );

  return { aliasMap, getAlias };
}
