import type { Metadata, Viewport } from 'next';
import { AuthProvider, LocaleProvider, WebSocketProvider } from '@hermes/shared-auth';
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
  title: 'HERMES',
  description: 'HERMES',
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
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {/* Theme flash prevention */}
        <script
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
        <ServiceWorkerRegistrator />
        {/* LocaleProvider wraps IntlProvider so locale changes re-render the message bundle */}
        <LocaleProvider>
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