/**
 * Date/time formatting helpers for the chat UI.
 *
 * All functions are pure and locale-aware via `Intl`.
 */

/** Formats a timestamp as a short time string (e.g. "14:30"). */
export function formatTime(dateStr: string, locale?: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

/** Full-width date divider, e.g. "Monday, 12 August". */
export function formatDateDivider(dateStr: string, locale?: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** Returns true when two timestamps fall on the same calendar day. */
export function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

/**
 * Relative timestamp for conversation lists, e.g. "2 min ago", "yesterday",
 * or a full date ("12/08/2026") for anything older than a week.
 */
export function formatRelativeTime(
  dateStr: string,
  locale?: string,
  now: number = Date.now(),
): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = now - date.getTime();

  if (Math.abs(diffMs) < MINUTE_MS) {
    return 'now';
  }

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(diffMs) < HOUR_MS) {
    return rtf.format(-Math.round(diffMs / MINUTE_MS), 'minute');
  }
  if (Math.abs(diffMs) < DAY_MS) {
    return rtf.format(-Math.round(diffMs / HOUR_MS), 'hour');
  }
  if (Math.abs(diffMs) < WEEK_MS) {
    return rtf.format(-Math.round(diffMs / DAY_MS), 'day');
  }

  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}