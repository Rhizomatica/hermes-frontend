import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AuthProvider, LocaleProvider, WebSocketProvider } from '@hermes/shared-auth';
import { ThemeProvider, ServiceWorkerRegistrator } from '@hermes/ui';
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
  const messages = await getMessages();
  // Resolve the theme server-side from the shared cookie so the `dark` class
  // is present on the initial HTML (removes the client-side flash-prevention
  // <script>, which React 19 flags during hydration).
  const theme = (await cookies()).get('hermes-theme')?.value;

  return (
    <html
      lang="en"
      className={theme === 'dark' ? 'dark' : undefined}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ServiceWorkerRegistrator
          basePath={process.env.NEXT_PUBLIC_BASE_PATH ?? ''}
          enabled={process.env.NODE_ENV === 'production'}
        />
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <ThemeProvider>
              <LocaleProvider>
                <WebSocketProvider>
                  {children}
                </WebSocketProvider>
              </LocaleProvider>
            </ThemeProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}