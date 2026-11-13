import type { Problem } from '@hermes/api';

/** A station API error reduced to what the UI needs. */
export interface ParsedProblem {
  /** Human-readable message (the daemon's detail/title, or a fallback). */
  message: string;
  /** Per-field validation messages from a 422, keyed by field name. */
  fieldErrors: Record<string, string[]>;
  /** Stable problem code (e.g. `conflict`, `invalid`), or null. */
  code: string | null;
  /** HTTP status carried by the problem, or null. */
  status: number | null;
}

function isProblem(value: unknown): value is Problem {
  if (typeof value !== 'object' || value == null) return false;
  const p = value as Partial<Problem>;
  return typeof p.code === 'string' || typeof p.title === 'string';
}

/**
 * Parse an RFC 9457 problem+json body (or any error body) into a UI-friendly
 * shape. Never throws; unknown bodies fall back to `fallback`.
 *
 * @example
 * const { message, fieldErrors } = parseProblem(data, 'Could not save');
 */
export function parseProblem(data: unknown, fallback: string): ParsedProblem {
  if (!isProblem(data)) {
    const message =
      typeof data === 'object' && data != null && 'message' in data &&
      typeof (data as { message?: unknown }).message === 'string'
        ? (data as { message: string }).message
        : fallback;
    return { message, fieldErrors: {}, code: null, status: null };
  }

  const fieldErrors: Record<string, string[]> = {};
  if (data.errors) {
    for (const [field, messages] of Object.entries(data.errors)) {
      if (Array.isArray(messages) && messages.length > 0) {
        fieldErrors[field] = messages.filter(
          (m): m is string => typeof m === 'string',
        );
      }
    }
  }

  return {
    message: data.detail || data.title || fallback,
    fieldErrors,
    code: data.code ?? null,
    status: typeof data.status === 'number' ? data.status : null,
  };
}
