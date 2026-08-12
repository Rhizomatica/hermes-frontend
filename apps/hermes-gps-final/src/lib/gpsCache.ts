import type { GpsPosition } from '@hermes/api';

const CACHE_KEY = 'hermes_gps_cache';
const CACHE_AGE_MINUTES_KEY = 'hermes_gps_cache_age';

export interface CachedGpsData {
  position: GpsPosition;
  cachedAt: string;
}

/**
 * Save the latest GPS position to localStorage cache.
 * Overwrites existing cache entry with a single position
 * plus the current ISO timestamp.
 */
export function saveGpsCache(position: GpsPosition): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const entry: CachedGpsData = {
      position,
      cachedAt: new Date().toISOString(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Storage full or unavailable — silently skip
  }
}

/**
 * Load the cached GPS position from localStorage.
 * Returns null if no cache exists, is unparseable, or is older
 * than the given maxAge (in milliseconds, default 24h).
 */
export function loadGpsCache(maxAgeMs: number = 86_400_000): CachedGpsData | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const entry = JSON.parse(raw) as CachedGpsData;
    if (!entry?.position?.latitude || !entry?.position?.longitude) return null;

    const age = Date.now() - new Date(entry.cachedAt).getTime();
    if (age > maxAgeMs) return null;

    return entry;
  } catch {
    return null;
  }
}

/**
 * Clear the GPS cache from localStorage.
 * Called on user logout to prevent stale data persisting between sessions.
 */
export function clearGpsCache(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Silently skip
  }
}

/**
 * Get the cached position age in milliseconds.
 * Returns null if no cache exists.
 */
export function getCacheAgeMs(): number | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const entry = JSON.parse(raw) as CachedGpsData;
    if (!entry?.cachedAt) return null;

    return Date.now() - new Date(entry.cachedAt).getTime();
  } catch {
    return null;
  }
}