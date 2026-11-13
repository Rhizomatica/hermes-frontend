'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import type { HermesUser, UserCreate, UserPatch } from '@hermes/api';
import { LoadingSpinner } from '@hermes/ui';
import {
  MAX_DISPLAY_NAME,
  MIN_PASSWORD_LENGTH,
  USERNAME_PATTERN,
  USER_LOCALES,
  USER_ROLES,
} from '@/lib/userOptions';
import type { UserMutationResult } from '@/hooks/useUsers';

export interface UserFormDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Create a new user or edit an existing one. */
  mode: 'create' | 'edit';
  /** The user being edited (edit mode). */
  user?: HermesUser | null;
  /** Whether the actor may change role, locale and disabled. */
  canManage: boolean;
  /** Called when the user cancels or the dialog closes. */
  onClose: () => void;
  /** Submit the validated form. */
  onSubmit: (
    input: UserCreate | UserPatch,
  ) => Promise<UserMutationResult<HermesUser>>;
}

const inputClass =
  'w-full rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900 outline-none placeholder-gray-400 focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white';

/**
 * Create/edit user dialog.
 *
 * Mirrors the daemon's constraints (username pattern, password length,
 * display-name length, roles and locales) and shows the server's per-field
 * 422 messages next to the matching input.
 *
 * @example
 * <UserFormDialog open mode="create" canManage onClose={close} onSubmit={create} />
 */
export default function UserFormDialog({
  open,
  mode,
  user,
  canManage,
  onClose,
  onSubmit,
}: UserFormDialogProps) {
  const t = useTranslations('users');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<string>('user');
  const [locale, setLocale] = useState<string>('en');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [disabled, setDisabled] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    setUsername(user?.username ?? '');
    setPassword('');
    setDisplayName(user?.display_name ?? '');
    setRole(user?.role ?? 'user');
    setLocale(user?.locale ?? 'en');
    setPhone(user?.phone ?? '');
    setLocation(user?.location ?? '');
    setDisabled(user?.disabled ?? false);
    setFormError(null);
    setFieldErrors({});
    if (!dialog.open) dialog.showModal();
  }, [open, user]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function validate(): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    if (mode === 'create' && !USERNAME_PATTERN.test(username)) {
      errors.username = [t('validation.username')];
    }
    if (mode === 'create' && password.length < MIN_PASSWORD_LENGTH) {
      errors.password = [t('validation.password')];
    }
    if (displayName.length > MAX_DISPLAY_NAME) {
      errors.display_name = [t('validation.displayName')];
    }
    if (canManage && !USER_ROLES.includes(role as (typeof USER_ROLES)[number])) {
      errors.role = [t('validation.role')];
    }
    if (
      canManage &&
      !USER_LOCALES.includes(locale as (typeof USER_LOCALES)[number])
    ) {
      errors.locale = [t('validation.locale')];
    }
    return errors;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError(null);
      return;
    }

    const input: UserCreate | UserPatch =
      mode === 'create'
        ? {
            username,
            password,
            display_name: displayName.trim() ? displayName : null,
            ...(canManage ? { role: role as UserCreate['role'] } : {}),
            ...(canManage ? { locale } : {}),
            ...(phone.trim() ? { phone: phone.trim() } : {}),
            ...(location.trim() ? { location: location.trim() } : {}),
          }
        : {
            display_name: displayName,
            ...(canManage ? { role: role as UserPatch['role'] } : {}),
            ...(canManage ? { locale } : {}),
            phone: phone.trim() ? phone.trim() : null,
            location: location.trim() ? location.trim() : null,
            ...(canManage ? { disabled } : {}),
          };

    setPending(true);
    setFormError(null);
    setFieldErrors({});
    const result = await onSubmit(input);
    setPending(false);
    if (result.ok) {
      onClose();
      return;
    }
    setFormError(result.message);
    setFieldErrors(result.fieldErrors);
  }

  function errorFor(field: string): string | undefined {
    return fieldErrors[field]?.[0];
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      className="w-full max-w-lg rounded-2xl bg-white p-6 text-gray-900 shadow-xl backdrop:bg-black/50 backdrop:backdrop-blur-sm dark:bg-gray-800 dark:text-white"
    >
      <h2 className="mb-4 text-lg font-bold">
        {mode === 'create' ? t('createTitle') : t('editTitle')}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'create' ? (
          <>
            <Field label={t('fields.username')} error={errorFor('username')}>
              <input
                className={inputClass}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
                aria-invalid={Boolean(errorFor('username'))}
              />
            </Field>
            <Field label={t('fields.password')} error={errorFor('password')}>
              <input
                className={inputClass}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                aria-invalid={Boolean(errorFor('password'))}
              />
            </Field>
          </>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('fields.username')}: <span className="font-semibold">{user?.username}</span>
          </p>
        )}

        <Field label={t('fields.displayName')} error={errorFor('display_name')}>
          <input
            className={inputClass}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={MAX_DISPLAY_NAME}
            aria-invalid={Boolean(errorFor('display_name'))}
          />
        </Field>

        {canManage && (
          <>
            <Field label={t('fields.role')} error={errorFor('role')}>
              <select
                className={inputClass}
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {USER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`roles.${r}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('fields.locale')} error={errorFor('locale')}>
              <select
                className={inputClass}
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
              >
                {USER_LOCALES.map((l) => (
                  <option key={l} value={l}>
                    {t(`locales.${l}`)}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}

        <Field label={t('fields.phone')} error={errorFor('phone')}>
          <input
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        <Field label={t('fields.location')} error={errorFor('location')}>
          <input
            className={inputClass}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </Field>

        {canManage && mode === 'edit' && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={disabled}
              onChange={(e) => setDisabled(e.target.checked)}
              className="h-4 w-4 accent-orange-500"
            />
            {t('fields.disabled')}
          </label>
        )}

        {formError && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {formError}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending && <LoadingSpinner label={t('saving')} />}
            {t('save')}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
      {error && (
        <span className="mt-1 block text-xs text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </label>
  );
}
