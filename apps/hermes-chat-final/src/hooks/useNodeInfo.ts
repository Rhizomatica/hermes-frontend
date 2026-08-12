'use client';

import { useEffect, useState } from 'react';

/**
 * useNodeInfo — fetches the local station's callsign/nodename from `GET /api/sys`.
 *
 * Used as the `orig` identity when composing new messages.
 *
 * @example
 * const orig = useNodeInfo();
 * // orig === 'pu2uit-3'
 */
export function useNodeInfo(): string {
  const [orig, setOrig] = useState('chat');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/sys')
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { data: { nodename?: string } } | null) => {
        if (!cancelled && json?.data.nodename) setOrig(json.data.nodename);
      })
      .catch(() => {
        // Keep the 'chat' fallback on failure.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return orig;
}