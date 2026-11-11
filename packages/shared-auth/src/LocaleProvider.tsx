'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { isLocale, LOCALE_COOKIE, LOCALE_STORAGE_KEY, type Locale } from './locale';

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

interface LocaleProviderProps {
  /** Locale resolved server-side from the shared cookie, so SSR and the first client render agree. */
  initialLocale?: Locale;
  children: ReactNode;
}

/** Persist the locale to a host-scoped cookie (shared across sub-apps and visible to the server). */
function setLocaleCookie(value: Locale): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${LOCALE_COOKIE}=${value}; Path=/; SameSite=Lax; Max-Age=31536000`;
}

export function LocaleProvider({ initialLocale = 'en', children }: LocaleProviderProps) {
  // Start from the server-resolved locale; do NOT read localStorage during render
  // (avoids the server/client hydration mismatch).
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Keep in sync with the shared cookie when it changes elsewhere (e.g. shell).
  const setLocale = useCallback((next: Locale) => {
    setLocaleCookie(next);
    if (typeof localStorage !== 'undefined') localStorage.setItem(LOCALE_STORAGE_KEY, next);
    setLocaleState(next);
  }, []);

  const value = useMemo<LocaleContextValue>(() => ({ locale, setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within <LocaleProvider>');
  return ctx;
}

export { isLocale };