'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { HermesUser, PasswordChange, UserPatch } from '@hermes/api';
import { parseProblem } from '@/lib/problem';
import type { UserMutationResult } from '@/hooks/useUsers';

export interface ProfileState {
  /** The loaded user, or null while loading or when `id` is null. */
  user: HermesUser | null;
  /** Profile fetch in flight. */
  loading: boolean;
  /** Last fetch failure message, or null. */
  error: string | null;
  /** Reload the profile. */
  refresh: () => Promise<void>;
  /** Patch display name, phone and/or location. */
  updateProfile: (patch: UserPatch) => Promise<UserMutationResult<HermesUser>>;
  /** Change the password (current password is required for non-admins). */
  changePassword: (
    change: PasswordChange,
  ) => Promise<UserMutationResult<null>>;
}

async function readProblem(res: Response, fallback: string) {
  const data = await res.json().catch(() => null);
  return parseProblem(data, fallback);
}

/**
 * Load and edit one user's profile.
 *
 * Used by the self-service profile page: the daemon allows any authenticated
 * user to read their own user and to patch their display name, phone and
 * location. Password changes require the current password unless an admin
 * is acting.
 *
 * @example
 * const profile = useProfile(user.id);
 * await profile.updateProfile({ display_name: 'Radio Operator' });
 */
export function useProfile(id: number | null): ProfileState {
  const [user, setUser] = useState<HermesUser | null>(null);
  const [loading, setLoading] = useState(id != null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (id == null) {
      if (mountedRef.current) {
        setUser(null);
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${id}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const problem = parseProblem(data, 'Failed to fetch profile');
        if (mountedRef.current) setError(problem.message);
        return;
      }
      if (mountedRef.current) setUser(data as HermesUser);
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const updateProfile = useCallback(
    async (patch: UserPatch): Promise<UserMutationResult<HermesUser>> => {
      if (id == null) {
        return {
          ok: false,
          message: 'No profile loaded',
          fieldErrors: {},
        };
      }
      try {
        const res = await fetch(`/api/users/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const problem = parseProblem(data, 'Failed to update profile');
          return {
            ok: false,
            message: problem.message,
            fieldErrors: problem.fieldErrors,
          };
        }
        const updated = data as HermesUser;
        if (mountedRef.current) setUser(updated);
        return { ok: true, data: updated };
      } catch (err) {
        return {
          ok: false,
          message:
            err instanceof Error ? err.message : 'Failed to update profile',
          fieldErrors: {},
        };
      }
    },
    [id],
  );

  const changePassword = useCallback(
    async (change: PasswordChange): Promise<UserMutationResult<null>> => {
      if (id == null) {
        return {
          ok: false,
          message: 'No profile loaded',
          fieldErrors: {},
        };
      }
      try {
        const res = await fetch(`/api/users/${id}/password`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(change),
        });
        if (!res.ok) {
          const problem = await readProblem(res, 'Failed to change password');
          return {
            ok: false,
            message: problem.message,
            fieldErrors: problem.fieldErrors,
          };
        }
        return { ok: true, data: null };
      } catch (err) {
        return {
          ok: false,
          message:
            err instanceof Error ? err.message : 'Failed to change password',
          fieldErrors: {},
        };
      }
    },
    [id],
  );

  return {
    user,
    loading,
    error,
    refresh,
    updateProfile,
    changePassword,
  };
}
