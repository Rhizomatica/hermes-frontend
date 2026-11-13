'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { HermesUser, UserCreate, UserPatch } from '@hermes/api';
import {
  ConfirmDialog,
  ErrorBanner,
  LoadingSpinner,
  SearchInput,
} from '@hermes/ui';
import { Plus } from 'lucide-react';
import { useUsers, type UserMutationResult } from '@/hooks/useUsers';
import UserFormDialog from './UserFormDialog';
import UserList from './UserList';
import SetPasswordDialog from './SetPasswordDialog';

export interface UsersPanelProps {
  /** The authenticated user, used to mark their own row. */
  currentUser: HermesUser;
}

/**
 * Admin user-management panel: search, list, paginate, and run CRUD.
 *
 * All mutations go through `useUsers`, which proxies the station API. The
 * daemon enforces authorization; this component only hides actions that would
 * fail for the current role.
 *
 * @example
 * <UsersPanel currentUser={user} />
 */
export default function UsersPanel({ currentUser }: UsersPanelProps) {
  const t = useTranslations('users');
  const users = useUsers();
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HermesUser | null>(null);
  const [passwordUser, setPasswordUser] = useState<HermesUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HermesUser | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users.users;
    return users.users.filter(
      (u) =>
        u.username.toLowerCase().includes(needle) ||
        (u.display_name ?? '').toLowerCase().includes(needle),
    );
  }, [users.users, query]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(user: HermesUser) {
    setEditing(user);
    setFormOpen(true);
  }

  async function submitCreate(
    input: UserCreate | UserPatch,
  ): Promise<UserMutationResult<HermesUser>> {
    const result = await users.createUser(input as UserCreate);
    if (result.ok) setSuccess(t('created'));
    return result;
  }

  async function submitEdit(
    input: UserCreate | UserPatch,
  ): Promise<UserMutationResult<HermesUser>> {
    if (!editing) {
      return { ok: false, message: t('errors.generic'), fieldErrors: {} };
    }
    const result = await users.updateUser(editing.id, input as UserPatch);
    if (result.ok) setSuccess(t('updated'));
    return result;
  }

  async function submitPassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<UserMutationResult<null>> {
    if (!passwordUser) {
      return { ok: false, message: t('errors.generic'), fieldErrors: {} };
    }
    const result = await users.setPassword(passwordUser.id, {
      ...(currentPassword ? { current_password: currentPassword } : {}),
      new_password: newPassword,
    });
    if (result.ok) setSuccess(t('password.changed'));
    return result;
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const result = await users.deleteUser(deleteTarget.id);
    if (result.ok) {
      setSuccess(t('deleted', { username: deleteTarget.username }));
      setDeleteTarget(null);
    } else {
      setActionError(result.message);
      setDeleteTarget(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200/70 bg-white/70 shadow-sm dark:border-gray-800 dark:bg-gray-800/60">
      <div className="flex flex-col gap-3 border-b border-gray-200/70 p-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {t('listTitle')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('listDescription')}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('create')}
        </button>
      </div>

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={t('searchPlaceholder')}
      />

      <div className="space-y-3 p-4">
        {users.error && <ErrorBanner message={users.error} />}
        {actionError && <ErrorBanner message={actionError} />}
        {success && (
          <p
            className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-300"
            role="status"
          >
            {success}
          </p>
        )}

        {users.loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner label={t('loading')} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {query ? t('noMatches') : t('empty')}
          </p>
        ) : (
          <UserList
            users={filtered}
            currentUserId={currentUser.id}
            canManage
            onEdit={openEdit}
            onSetPassword={setPasswordUser}
            onDelete={setDeleteTarget}
          />
        )}

        {users.nextCursor && !query && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => void users.loadMore()}
              disabled={users.loadingMore}
              className="min-h-[44px] rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {users.loadingMore ? t('loadingMore') : t('loadMore')}
            </button>
          </div>
        )}
      </div>

      <UserFormDialog
        open={formOpen}
        mode={editing ? 'edit' : 'create'}
        user={editing}
        canManage
        onClose={() => setFormOpen(false)}
        onSubmit={editing ? submitEdit : submitCreate}
      />

      <SetPasswordDialog
        open={passwordUser != null}
        username={passwordUser?.username ?? ''}
        requireCurrent={false}
        onClose={() => setPasswordUser(null)}
        onSubmit={submitPassword}
      />

      <ConfirmDialog
        open={deleteTarget != null}
        title={t('deleteTitle')}
        message={t('deleteMessage', {
          username: deleteTarget?.username ?? '',
        })}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
}
