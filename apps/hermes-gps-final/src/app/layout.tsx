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
  title: 'HERMES GPS',
  description: 'HERMES — GPS Viewer',
  manifest: '/manifest.json',
};

/**
 * Root layout for hermes-gps-final.
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = (document.cookie.match(/(?:^|;\\s*)hermes-theme=([^;]*)/) || [])[1] || localStorage.getItem('hermes-theme');
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
        <ServiceWorkerRegistrator
          basePath={process.env.NEXT_PUBLIC_BASE_PATH ?? ''}
          enabled={process.env.NODE_ENV === 'production'}
        />
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