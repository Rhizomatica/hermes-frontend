import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { isLocale, type Locale } from '@hermes/shared-auth';

export default getRequestConfig(async () => {
  // Resolve the locale server-side from the shared host-scoped cookie so the
  // initial HTML matches the user's persisted language across sub-apps.
  const stored = (await cookies()).get('hermes-locale')?.value;
  const locale: Locale = isLocale(stored) ? stored : 'en';

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});