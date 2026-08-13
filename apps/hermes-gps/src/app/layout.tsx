import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider, LocaleProvider, WebSocketProvider } from '@hermes/shared-auth';
import { ThemeProvider } from '@hermes/ui';


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HERMES GPS",
  description: "Hermes station geolocation – a Rhizomatica project",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('hermes_theme');var p=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';if((s||p)==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
        <LocaleProvider>
          <ThemeProvider>
            <WebSocketProvider>
              {children}
            </WebSocketProvider>
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
