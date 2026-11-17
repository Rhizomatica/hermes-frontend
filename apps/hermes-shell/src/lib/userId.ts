/**
 * Validate a `{userId}` path segment.
 *
 * Returns the numeric id when the segment is a positive safe integer, or
 * `null` for anything else (empty, non-numeric, zero, negative, or too large
 * to represent exactly).
 */
export function userIdFrom(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
