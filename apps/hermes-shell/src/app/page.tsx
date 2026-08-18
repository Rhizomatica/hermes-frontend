'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth, useAuthGuard, useLocale } from '@hermes/shared-auth';
import { LogOut, Moon, Sun, MapPin, MessagesSquare } from 'lucide-react';
import { useTheme, LoadingSpinner } from '@hermes/ui';
import InfoList from '@/components/InfoList';

const GPS_URL = process.env.NEXT_PUBLIC_GPS_URL ?? '/gps';
const CHAT_URL = process.env.NEXT_PUBLIC_CHAT_URL ?? '/chat';

/**
 * App selector page — authenticated home screen for hermes-shell.
 */
export default function AppSelector() {
  const t = useTranslations('home');
  const tc = useTranslations('common');
  const tu = useTranslations('user');
  const user = useAuthGuard();
  const { logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const router = useRouter();

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <LoadingSpinner label={t('loading')} />
      </main>
    );
  }

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  const nextLocale = locale === 'en' ? 'pt' : 'en';

  const userItems = [
    { label: tu('callsign'), value: user.callsign },
    { label: tu('displayName'), value: user.displayName },
    { label: tu('email'), value: user.email ?? tu('na') },
    { label: tu('role'), value: user.role },
    { label: tu('status'), value: user.status },
    { label: tu('locale'), value: user.locale },
  ];

  const initials = user.displayName
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50/60 via-background to-background dark:from-gray-900 dark:via-gray-950 dark:to-gray-950">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-gray-200/70 dark:border-gray-800 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-20 w-20 items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-hermes-500-wings.png" alt={t('title')} className="h-20 w-20 object-contain" />
            </span>
            <span className="text-lg font-black tracking-tight text-gray-900 dark:text-white">
              {t('title')}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={toggleTheme} aria-label={tc('themeToggle')} className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800" style={{ minHeight: '44px', minWidth: '44px' }}>
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button onClick={() => setLocale(nextLocale)} aria-label={tc('localeToggle')} className="flex h-10 items-center justify-center rounded-full px-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800" style={{ minHeight: '44px' }}>
              {nextLocale.toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Greeting hero */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-xl font-black text-white shadow-xl shadow-orange-500/30 ring-4 ring-white dark:ring-gray-800">
              {initials}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('welcome')}</p>
              <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                {user.displayName}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user.callsign}
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-red-900 dark:hover:bg-red-900/20 dark:hover:text-red-400" style={{ minHeight: '44px' }}>
            <LogOut className="h-4 w-4" />
            {t('logout')}
          </button>
        </div>

        {/* App cards */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link href={GPS_URL} className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white/70 p-6 transition-all hover:-translate-y-1 hover:border-orange-300 hover:bg-white/90 hover:shadow-xl hover:shadow-orange-500/10 dark:border-gray-800 dark:bg-gray-800/60 dark:hover:bg-gray-800/80">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-orange-100/70 blur-2xl transition-all group-hover:bg-orange-200/70 dark:bg-orange-500/10" />
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-500/20 text-3xl">
              <MapPin />
            </span>
            <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">{t('gpsViewer')}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('gpsDescription')}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-orange-600 dark:text-orange-400">
              {t('open')} <span className="transition-transform group-hover:translate-x-1">→</span>
            </span>
          </Link>

          <Link href={CHAT_URL} className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white/70 p-6 transition-all hover:-translate-y-1 hover:border-orange-300 hover:bg-white/90 hover:shadow-xl hover:shadow-orange-500/10 dark:border-gray-800 dark:bg-gray-800/60 dark:hover:bg-gray-800/80">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-orange-100/70 blur-2xl transition-all group-hover:bg-orange-200/70 dark:bg-orange-500/10" />
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-500/20 text-3xl">
              <MessagesSquare />
            </span>
            <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">{t('chat')}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('chatDescription')}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-orange-600 dark:text-orange-400">
              {t('open')} <span className="transition-transform group-hover:translate-x-1">→</span>
            </span>
          </Link>
        </div>

        {/* User info */}
        <div className="mt-8">
          <InfoList title={tu('title')} items={userItems} />
        </div>
      </div>
    </main>
  );
}