/**
 * Runtime URL derivation for the co-deployed HERMES frontend apps.
 *
 * Each app runs on its own port on the same host, so sibling URLs are derived
 * from the page the browser loaded instead of being baked into the bundle at
 * build time. This keeps one artifact valid for every station.
 *
 * These helpers are SSR-safe: they return `null` on the server so callers can
 * render a relative fallback and compute the absolute URL after mount.
 */

export const APP_PORTS = {
  shell: 4000,
  gps: 4001,
  chat: 4002,
} as const;

export type HermesApp = keyof typeof APP_PORTS;

function browserLocation(): Location | null {
  if (typeof window === 'undefined') return null;
  return window.location ?? null;
}

/** Absolute origin for a sibling app on the current host, or null on the server. */
export function appOrigin(port: number): string | null {
  const location = browserLocation();
  if (!location) return null;
  const protocol = location.protocol === 'http:' ? 'http:' : 'https:';
  return `${protocol}//${location.hostname}:${port}`;
}

/** Absolute URL for an app path, or null on the server. */
export function appUrl(app: HermesApp, path = '/'): string | null {
  const origin = appOrigin(APP_PORTS[app]);
  if (!origin) return null;
  return path.startsWith('/') ? `${origin}${path}` : `${origin}/${path}`;
}

/**
 * Same-origin WebSocket endpoint proxied by nginx on each app's port.
 * Uses `wss:` on HTTPS pages and `ws:` on HTTP (local development).
 * Returns null on the server.
 */
export function wsUrl(): string | null {
  const location = browserLocation();
  if (!location) return null;
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/ws`;
}
