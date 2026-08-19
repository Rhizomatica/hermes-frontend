'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Locale = 'en' | 'pt';

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  // Hydrate the locale from localStorage only after mount so the initial
  // server and client renders match (avoids hydration mismatch when a
  // non-English locale is persisted). Defaults to 'en' to mirror the SSR.
  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    const persisted = localStorage.getItem('hermes-locale') as Locale | null;
    if (persisted === 'en' || persisted === 'pt') {
      setLocaleState(persisted);
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('hermes-locale', next);
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