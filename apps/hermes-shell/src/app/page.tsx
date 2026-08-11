'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth, useAuthGuard, useLocale } from '@hermes/shared-auth';
import { useTheme } from '@hermes/ui';
import { LoadingSpinner } from '@hermes/ui';

/**
 * App selector page — authenticated home screen for hermes-shell.
 *
 * Uses useAuthGuard for auth enforcement. Shows navigation cards
 * for GPS Viewer and Chat, user info, logout, theme & locale toggles.
 */
export default function AppSelector() {
  const t = useTranslations('home');
  const tc = useTranslations('common');
  const user = useAuthGuard();
  const { logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const router = useRouter();

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <LoadingSpinner />
      </main>
    );
  }

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  const nextLocale = locale === 'en' ? 'pt' : 'en';

  return (
    <main className="flex min-h-screen flex-col p-4">
      <div className="flex items-center justify-end gap-2">
        <button onClick={toggleTheme} aria-label={tc('themeToggle')} className="rounded-lg p-2 hover:bg-gray-200 dark:hover:bg-gray-700" style={{ minHeight: '44px', minWidth: '44px' }}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button onClick={() => setLocale(nextLocale)} aria-label={tc('localeToggle')} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700" style={{ minHeight: '44px' }}>
          {nextLocale.toUpperCase()}
        </button>
      </div>

      <div className="mt-2 text-center">
        <h1 className="text-2xl font-bold text-orange-500">{t('title')}</h1>
        <p className="mt-1 text-base text-foreground/70">{t('greeting', { name: user.name })}</p>
      </div>

      <div className="mt-8 flex flex-1 flex-col gap-4 sm:flex-row sm:justify-center">
        <a href="/gps" className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-gray-200 bg-background p-6 text-center hover:border-orange-500 active:border-orange-600 dark:border-gray-700 sm:max-w-xs" style={{ minHeight: '160px' }}>
          <span className="text-4xl">📍</span>
          <h2 className="mt-3 text-lg font-semibold">{t('gpsViewer')}</h2>
          <p className="mt-1 text-sm text-foreground/60">{t('gpsDescription')}</p>
        </a>
        <a href="/chat" className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-gray-200 bg-background p-6 text-center hover:border-orange-500 active:border-orange-600 dark:border-gray-700 sm:max-w-xs" style={{ minHeight: '160px' }}>
          <span className="text-4xl">💬</span>
          <h2 className="mt-3 text-lg font-semibold">{t('chat')}</h2>
          <p className="mt-1 text-sm text-foreground/60">{t('chatDescription')}</p>
        </a>
      </div>

      <div className="mt-6 text-center">
        <button onClick={handleLogout} className="rounded-lg px-6 py-3 text-sm font-medium text-foreground/60 hover:text-red-500" style={{ minHeight: '44px' }}>
          {t('logout')}
        </button>
      </div>
    </main>
  );
}