'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type Locale = 'en' | 'pt';

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof localStorage === 'undefined') return 'en';
    return (localStorage.getItem('hermes-locale') as Locale) || 'en';
  });

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