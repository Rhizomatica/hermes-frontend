import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AuthProvider, LocaleProvider, WebSocketProvider } from '@hermes/shared-auth';
import { ThemeProvider } from '@hermes/ui';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'HERMES',
  description: 'HERMES — sBitx Radio Ground Station',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
  },
};

/**
 * Root layout for hermes-shell.
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

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Theme flash prevention */}
        <Script
          id="theme-flash"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('hermes-theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        {/* Service Worker registration */}
        <Script
          id="sw-register"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
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