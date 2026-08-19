'use client';

import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { useLocale } from '@hermes/shared-auth';
import en from '../../messages/en.json';
import pt from '../../messages/pt.json';

const messagesByLocale = { en, pt } as const;

/**
 * Locale-aware next-intl provider.
 *
 * Reads the active locale from <LocaleProvider> and feeds the matching
 * message bundle to <NextIntlClientProvider>, so the language swaps at
 * runtime and stays in sync across sub-apps via the shared cookie.
 */
export default function IntlProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  return (
    <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]}>
      {children}
    </NextIntlClientProvider>
  );
}