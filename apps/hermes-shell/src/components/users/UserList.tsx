'use client';

import { useTranslations } from 'next-intl';
import { KeyRound, Pencil, Trash2 } from 'lucide-react';
import type { HermesUser } from '@hermes/api';

export interface UserListProps {
  /** Users to render. */
  users: HermesUser[];
  /** The authenticated user's id, so their own row can be marked. */
  currentUserId: number | null;
  /** Admin actions are available. */
  canManage: boolean;
  /** Open the edit dialog for a user. */
  onEdit: (user: HermesUser) => void;
  /** Open the password dialog for a user. */
  onSetPassword: (user: HermesUser) => void;
  /** Ask to delete a user. */
  onDelete: (user: HermesUser) => void;
}

function isRoot(user: HermesUser): boolean {
  return user.username === 'root';
}

/**
 * Responsive list of users with admin actions.
 *
 * `root` is shown with a recovery-account badge and no mutating actions,
 * matching the daemon's immutability rules.
 *
 * @example
 * <UserList users={users} currentUserId={me.id} canManage onEdit={…} onSetPassword={…} onDelete={…} />
 */
export default function UserList({
  users,
  currentUserId,
  canManage,
  onEdit,
  onSetPassword,
  onDelete,
}: UserListProps) {
  const t = useTranslations('users');

  return (
    <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
      {users.map((user) => {
        const root = isRoot(user);
        const label = user.display_name || user.username;
        return (
          <li
            key={user.id}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-semibold text-gray-900 dark:text-white">
                  {label}
                </span>
                {user.id === currentUserId && (
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
                    {t('badges.you')}
                  </span>
                )}
                {root && (
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                    {t('badges.root')}
                  </span>
                )}
                {user.disabled && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/20 dark:text-red-300">
                    {t('badges.disabled')}
                  </span>
                )}
              </div>
              <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                {user.username} · {t(`roles.${user.role}`)} · {user.locale}
              </p>
              {root && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('rootHint')}
                </p>
              )}
            </div>

            {canManage && (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(user)}
                  disabled={root}
                  aria-label={t('actions.editAria', { username: user.username })}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onSetPassword(user)}
                  disabled={root}
                  aria-label={t('actions.passwordAria', {
                    username: user.username,
                  })}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                >
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(user)}
                  disabled={root}
                  aria-label={t('actions.deleteAria', {
                    username: user.username,
                  })}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
