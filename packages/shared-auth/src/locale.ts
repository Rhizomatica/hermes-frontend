export type Locale = 'en' | 'pt';

/** Shared cookie name (host-scoped, mirrors ADR-003 / theme cookie). */
export const LOCALE_COOKIE = 'hermes-locale';

/** localStorage fallback key for local development. */
export const LOCALE_STORAGE_KEY = 'hermes-locale';

export const LOCALES: readonly Locale[] = ['en', 'pt'];

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'pt';
}