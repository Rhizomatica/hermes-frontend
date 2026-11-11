'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@hermes/shared-auth';
import { ErrorBanner, LoadingSpinner } from '@hermes/ui';

export default function LoginPage() {
  const t = useTranslations('login');
  const { login, error, isLoading } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = localError ?? error;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      router.replace('/');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t('networkError'));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-orange-50/60 via-background to-background p-4 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950">
        <LoadingSpinner label={t('loading')} />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-orange-50/60 via-background to-background p-4 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-gray-200/70 bg-white/70 p-8 shadow-lg shadow-gray-900/5 backdrop-blur dark:border-gray-800 dark:bg-gray-800/80">
          <div className="mb-8 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-hermes-500.png"
              alt="HERMES"
              className="mx-auto h-28 w-28 object-contain"
            />
            <p className="mt-4 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              {t('tagline')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('usernameLabel')}
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                aria-describedby={displayError ? 'login-error' : undefined}
                className="mt-2 block w-full rounded-xl border border-gray-300 bg-background px-4 py-2.5 text-base text-foreground placeholder:text-foreground/40 transition-colors focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 dark:border-gray-600 dark:bg-gray-900/40"
                style={{ minHeight: '44px' }}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('passwordLabel')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="mt-2 block w-full rounded-xl border border-gray-300 bg-background px-4 py-2.5 text-base text-foreground placeholder:text-foreground/40 transition-colors focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 dark:border-gray-600 dark:bg-gray-900/40"
                style={{ minHeight: '44px' }}
              />
            </div>

            {displayError && (
              <div id="login-error">
                <ErrorBanner message={displayError} />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !username.trim() || !password}
              className="w-full rounded-xl bg-orange-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-orange-500/20 transition-colors hover:bg-orange-600 active:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ minHeight: '44px' }}
            >
              {submitting ? t('submitting') : t('submit')}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
