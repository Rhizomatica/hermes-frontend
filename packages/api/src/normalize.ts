/**
 * Message and station address normalization utilities.
 *
 * Pure functions with no side effects — safe to use in both server
 * (API route handlers) and client (hooks, components) contexts.
 */

/**
 * Normalize a message's `dest` field to always be a string array.
 *
 * The backend may return `dest` as a single string or as an array of
 * recipient addresses. This collapses both forms into a consistent array.
 *
 * @example
 * destArray('PU2UIT-3')          // => ['PU2UIT-3']
 * destArray(['PU2UIT-3', 'PY2ZZ']) // => ['PU2UIT-3', 'PY2ZZ']
 * destArray(undefined)           // => []
 */
export function destArray(dest: string[] | string | undefined | null): string[] {
  if (Array.isArray(dest)) return dest;
  if (typeof dest === 'string') return dest ? [dest] : [];
  return [];
}

/**
 * Normalize a station address to its bare identifier.
 *
 * Handles both email-style ("station@domain") and DNS-style
 * ("station.domain.tld") addresses. Assumes station base names do not
 * contain dots or `@` signs.
 *
 * @example
 * stationId('PU2UIT-3@hermes.local') // => 'pu2uit-3'
 * stationId('pu2uit-3.hermes.local') // => 'pu2uit-3'
 * stationId('  PU2UIT-3 ')          // => 'pu2uit-3'
 */
export function stationId(address: string): string {
  const trimmed = address.trim().toLowerCase();
  // Strip @domain (email/Hermes format)
  const noAt = trimmed.includes('@') ? trimmed.split('@')[0] : trimmed;
  // Strip .domain suffix (DNS hostname format)
  return noAt.split('.')[0];
}

/**
 * Resolve a station address to its canonical alias key.
 *
 * `aliasMap` is `Map<stationId(realName), alias>` — e.g.
 * `{ "pu2uit-3" => "estacao3" }`. Both the real callsign and the alias
 * resolve to the same canonical string.
 *
 * @example
 * const map = new Map([['pu2uit-3', 'estacao3']]);
 * canonicalize('PU2UIT-3', map) // => 'estacao3'
 * canonicalize('estacao3', map) // => 'estacao3'
 */
export function canonicalize(address: string, aliasMap: Map<string, string>): string {
  const id = stationId(address);
  return aliasMap.get(id) ?? id;
}