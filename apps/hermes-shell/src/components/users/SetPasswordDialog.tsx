'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { MIN_PASSWORD_LENGTH } from '@/lib/userOptions';
import type { UserMutationResult } from '@/hooks/useUsers';

export interface SetPasswordDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** The user whose password is being changed. */
  username: string;
  /** Require the current password (self-service flow). */
  requireCurrent: boolean;
  /** Called when the user cancels or the dialog closes. */
  onClose: () => void;
  /** Submit the change; resolves with the daemon's result. */
  onSubmit: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<UserMutationResult<null>>;
}

const inputClass =
  'w-full rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900 outline-none placeholder-gray-400 focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white';

/**
 * Password dialog for a self-service change (current + new) or an admin
 * reset (new only). Shows the daemon's field errors, including a wrong
 * `current_password`.
 *
 * @example
 * <SetPasswordDialog open username="pu2uit" requireCurrent onClose={close} onSubmit={change} />
 */
export default function SetPasswordDialog({
  open,
  username,
  requireCurrent,
  onClose,
  onSubmit,
}: SetPasswordDialogProps) {
  const t = useTranslations('users');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setFormError(null);
    setFieldErrors({});
    if (!dialog.open) dialog.showModal();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors: Record<string, string[]> = {};
    if (requireCurrent && !currentPassword) {
      errors.current_password = [t('validation.currentPassword')];
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      errors.new_password = [t('validation.password')];
    }
    if (confirmPassword !== newPassword) {
      errors.confirm_password = [t('validation.passwordMatch')];
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError(null);
      return;
    }

    setPending(true);
    setFormError(null);
    setFieldErrors({});
    const result = await onSubmit(currentPassword, newPassword);
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
      className="w-full max-w-sm rounded-2xl bg-white p-6 text-gray-900 shadow-xl backdrop:bg-black/50 backdrop:backdrop-blur-sm dark:bg-gray-800 dark:text-white"
    >
      <h2 className="mb-1 text-lg font-bold">{t('password.title')}</h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        {t('password.forUser', { username })}
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        {requireCurrent && (
          <Field
            label={t('fields.currentPassword')}
            error={errorFor('current_password')}
          >
            <input
              className={inputClass}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              aria-invalid={Boolean(errorFor('current_password'))}
            />
          </Field>
        )}
        <Field label={t('fields.newPassword')} error={errorFor('new_password')}>
          <input
            className={inputClass}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            aria-invalid={Boolean(errorFor('new_password'))}
          />
        </Field>
        <Field
          label={t('fields.confirmPassword')}
          error={errorFor('confirm_password')}
        >
          <input
            className={inputClass}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            aria-invalid={Boolean(errorFor('confirm_password'))}
          />
        </Field>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('password.endsSessions')}
        </p>

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
            className="min-h-[44px] rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? t('saving') : t('save')}
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
