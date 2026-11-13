'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronLeft, KeyRound } from 'lucide-react';
import { useAuthGuard, useLocale } from '@hermes/shared-auth';
import { ErrorBanner, LoadingSpinner } from '@hermes/ui';
import type { HermesUser } from '@hermes/api';
import { useProfile } from '@/hooks/useProfile';
import type { UserMutationResult } from '@/hooks/useUsers';
import SetPasswordDialog from '@/components/users/SetPasswordDialog';
import { MAX_DISPLAY_NAME } from '@/lib/userOptions';

const SHELL_URL = process.env.NEXT_PUBLIC_SHELL_URL ?? '';

const inputClass =
  'w-full rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900 outline-none placeholder-gray-400 focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white';

/**
 * Self-service profile page.
 *
 * Any authenticated user may edit their display name, phone and location, and
 * change their own password (sending the current one). Username, role, locale
 * and timestamps are read-only here: only admins may change role/locale.
 *
 * @example
 * // Rendered at /profile
 * <ProfilePage />
 */
export default function ProfilePage() {
  const t = useTranslations('profile');
  const tu = useTranslations('users');
  const tc = useTranslations('common');
  const user = useAuthGuard();
  const { locale } = useLocale();
  const profile = useProfile(user?.id ?? null);

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <LoadingSpinner label={t('loading')} />
      </main>
    );
  }

  const current = profile.user ?? user;

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50/60 via-background to-background dark:from-gray-900 dark:via-gray-950 dark:to-gray-950">
      <header className="sticky top-0 z-10 border-b border-gray-200/70 bg-background/70 backdrop-blur-md dark:border-gray-800">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
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

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        {profile.error && <ErrorBanner message={profile.error} />}

        <section className="rounded-2xl border border-gray-200/70 bg-white/70 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800/60">
          <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
            {t('accountTitle')}
          </h2>
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500 dark:text-gray-400">{tu('fields.username')}</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">{current.username}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">{tu('fields.role')}</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">
                {tu(`roles.${current.role}`)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">{tu('fields.locale')}</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">
                {tu(`locales.${current.locale}`)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">{t('lastLogin')}</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">
                {formatDate(current.last_login_at, locale)}
              </dd>
            </div>
          </dl>
        </section>

        {profile.loading ? (
          <div className="flex justify-center py-6">
            <LoadingSpinner label={t('loading')} />
          </div>
        ) : (
          <ProfileForm
            key={current.id}
            user={current}
            onSubmit={profile.updateProfile}
            onChangePassword={profile.changePassword}
          />
        )}
      </div>
    </main>
  );
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

interface ProfileFormProps {
  user: HermesUser;
  onSubmit: (patch: {
    display_name: string;
    phone: string | null;
    location: string | null;
  }) => Promise<UserMutationResult<HermesUser>>;
  onChangePassword: (
    change: { current_password: string; new_password: string },
  ) => Promise<UserMutationResult<null>>;
}

function ProfileForm({ user, onSubmit, onChangePassword }: ProfileFormProps) {
  const t = useTranslations('profile');
  const tu = useTranslations('users');
  const [displayName, setDisplayName] = useState(user.display_name ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [location, setLocation] = useState(user.location ?? '');
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (displayName.length > MAX_DISPLAY_NAME) {
      setFieldErrors({ display_name: [tu('validation.displayName')] });
      return;
    }
    setPending(true);
    setFormError(null);
    setFieldErrors({});
    setSuccess(null);
    const result = await onSubmit({
      display_name: displayName,
      phone: phone.trim() ? phone.trim() : null,
      location: location.trim() ? location.trim() : null,
    });
    setPending(false);
    if (result.ok) {
      setSuccess(t('saved'));
    } else {
      setFormError(result.message);
      setFieldErrors(result.fieldErrors);
    }
  }

  async function handlePassword(currentPassword: string, newPassword: string) {
    const result = await onChangePassword({
      current_password: currentPassword,
      new_password: newPassword,
    });
    if (result.ok) setSuccess(t('passwordChanged'));
    return result;
  }

  const errorFor = (field: string) => fieldErrors[field]?.[0];

  return (
    <>
      <section className="rounded-2xl border border-gray-200/70 bg-white/70 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800/60">
        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
          {t('editTitle')}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{tu('fields.displayName')}</span>
            <input
              className={inputClass}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={MAX_DISPLAY_NAME}
              aria-invalid={Boolean(errorFor('display_name'))}
            />
            {errorFor('display_name') && (
              <span className="mt-1 block text-xs text-red-600 dark:text-red-400">
                {errorFor('display_name')}
              </span>
            )}
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{tu('fields.phone')}</span>
            <input
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={Boolean(errorFor('phone'))}
            />
            {errorFor('phone') && (
              <span className="mt-1 block text-xs text-red-600 dark:text-red-400">
                {errorFor('phone')}
              </span>
            )}
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{tu('fields.location')}</span>
            <input
              className={inputClass}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              aria-invalid={Boolean(errorFor('location'))}
            />
            {errorFor('location') && (
              <span className="mt-1 block text-xs text-red-600 dark:text-red-400">
                {errorFor('location')}
              </span>
            )}
          </label>

          {formError && <ErrorBanner message={formError} />}
          {success && (
            <p
              className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-300"
              role="status"
            >
              {success}
            </p>
          )}

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => setPasswordOpen(true)}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              {t('changePassword')}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="min-h-[44px] rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </section>

      <SetPasswordDialog
        open={passwordOpen}
        username={user.username}
        requireCurrent
        onClose={() => setPasswordOpen(false)}
        onSubmit={handlePassword}
      />
    </>
  );
}
