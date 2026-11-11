export type Locale = 'en' | 'pt';

/** Shared cookie name (host-scoped, mirrors ADR-003 / theme cookie). */
export const LOCALE_COOKIE = 'hermes-locale';

/** localStorage fallback key for local development. */
export const LOCALE_STORAGE_KEY = 'hermes-locale';

/**
 * Global default timezone (IANA name) shared by the next-intl server config
 * (`src/i18n/request.ts`) and the client `<NextIntlClientProvider>` so that
 * server and client render dates in the same timezone (avoids
 * `ENVIRONMENT_FALLBACK` markup mismatches).
 */
export const DEFAULT_TIME_ZONE = 'UTC';

export const LOCALES: readonly Locale[] = ['en', 'pt'];

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'pt';
}