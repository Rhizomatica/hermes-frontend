import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { AuthProvider, LocaleProvider, WebSocketProvider, isLocale, type Locale } from '@hermes/shared-auth';
import { ThemeProvider, ServiceWorkerRegistrator } from '@hermes/ui';
import IntlProvider from '@/components/IntlProvider';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'HERMES Chat',
  description: 'HERMES — Chat & Messaging',
  manifest: '/manifest.json',
};

/**
 * Root layout for hermes-chat-final.
 *
 * Provider hierarchy (ADR-006 §3.1):
 *   NextIntlClientProvider → AuthProvider → ThemeProvider →
 *   LocaleProvider → WebSocketProvider → children
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolve the theme and locale server-side from the shared cookies so the
  // initial HTML matches the user's persisted preferences across sub-apps.
  const theme = (await cookies()).get('hermes-theme')?.value;
  const storedLocale = (await cookies()).get('hermes-locale')?.value;
  const locale: Locale = isLocale(storedLocale) ? storedLocale : 'en';

  return (
    <html
      lang={locale}
      className={theme === 'dark' ? 'dark' : undefined}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ServiceWorkerRegistrator
          basePath={process.env.NEXT_PUBLIC_BASE_PATH ?? ''}
          enabled={process.env.NODE_ENV === 'production'}
        />
        {/* LocaleProvider wraps IntlProvider so locale changes re-render the message bundle */}
        <LocaleProvider initialLocale={locale}>
          <IntlProvider>
            <AuthProvider>
              <ThemeProvider>
                <WebSocketProvider>
                  {children}
                </WebSocketProvider>
              </ThemeProvider>
            </AuthProvider>
          </IntlProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}