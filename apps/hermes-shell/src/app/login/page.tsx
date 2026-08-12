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
  const [callsign, setCallsign] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = localError ?? error;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);
    setSubmitting(true);
    try {
      await login(callsign, password);
      router.replace('/');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t('networkError'));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <LoadingSpinner />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-orange-500">HERMES</h1>
          <p className="mt-1 text-base text-foreground/60">sBitx Radio Ground Station</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="callsign" className="block text-sm font-medium">{t('callsignLabel')}</label>
            <input
              id="callsign"
              type="text"
              value={callsign}
              onChange={(e) => setCallsign(e.target.value)}
              autoComplete="username"
              required
              aria-describedby={displayError ? 'login-error' : undefined}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-background px-3 py-2 text-base text-foreground placeholder:text-foreground/40 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-gray-600"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">{t('passwordLabel')}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-background px-3 py-2 text-base text-foreground placeholder:text-foreground/40 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-gray-600"
            />
          </div>

          {displayError && (
            <div id="login-error">
              <ErrorBanner message={displayError} />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !callsign.trim() || !password}
            className="w-full rounded-lg bg-orange-500 px-4 py-3 text-base font-semibold text-white hover:bg-orange-600 active:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ minHeight: '44px' }}
          >
            {submitting ? t('submitting') : t('submit')}
          </button>
        </form>
      </div>
    </main>
  );
}