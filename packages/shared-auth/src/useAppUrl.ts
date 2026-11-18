'use client';

import { useEffect, useState } from 'react';
import { appUrl, type HermesApp } from './appUrls';

/**
 * Returns a sibling app URL derived from `location` after mount.
 *
 * The first render (including SSR) uses `fallback`, so the server HTML and the
 * client's first render match and hydration does not mismatch. The effect then
 * swaps in the absolute URL.
 */
export function useAppUrl(app: HermesApp, path = '/', fallback = '/'): string {
  const [url, setUrl] = useState(fallback);

  useEffect(() => {
    setUrl(appUrl(app, path) ?? fallback);
  }, [app, path, fallback]);

  return url;
}
