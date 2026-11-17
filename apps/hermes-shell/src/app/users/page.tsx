'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';
import { useAuthGuard } from '@hermes/shared-auth';
import { LoadingSpinner } from '@hermes/ui';
import UsersPanel from '@/components/users/UsersPanel';

const SHELL_URL = process.env.NEXT_PUBLIC_SHELL_URL ?? '';

/**
 * Admin user-management page.
 *
 * Non-admins see a forbidden state; the station API still enforces the same
 * rule on every request.
 *
 * @example
 * // Rendered at /users
 * <UsersPage />
 */
export default function UsersPage() {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const user = useAuthGuard();

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <LoadingSpinner label={t('loading')} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50/60 via-background to-background dark:from-gray-900 dark:via-gray-950 dark:to-gray-950">
      <header className="sticky top-0 z-10 border-b border-gray-200/70 bg-background/70 backdrop-blur-md dark:border-gray-800">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            href={SHELL_URL || '/'}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-sm font-medium text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-500/10"
            aria-label={tc('backToHermes')}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {tc('backToHermes')}
          </Link>
          <h1 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">
            {t('title')}
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        {user.role === 'admin' ? (
          <UsersPanel currentUser={user} />
        ) : (
          <p
            className="rounded-2xl border border-gray-200/70 bg-white/70 p-6 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-300"
            role="alert"
          >
            {t('forbidden')}
          </p>
        )}
      </div>
    </main>
  );
}
