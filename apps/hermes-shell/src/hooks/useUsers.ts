'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  HermesUser,
  PasswordChange,
  UserCreate,
  UserPage,
  UserPatch,
} from '@hermes/api';
import { parseProblem } from '@/lib/problem';

/** Result of a user mutation: success with data, or an expected failure. */
export type UserMutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors: Record<string, string[]> };

export interface UsersState {
  /** Users loaded so far, in the daemon's order. */
  users: HermesUser[];
  /** Cursor for the next page, or null when there are no more. */
  nextCursor: string | null;
  /** Initial list fetch in flight. */
  loading: boolean;
  /** Next page fetch in flight. */
  loadingMore: boolean;
  /** Last list failure message, or null. */
  error: string | null;
  /** Reload the first page. */
  refresh: () => Promise<void>;
  /** Load the next page, when `nextCursor` is set. */
  loadMore: () => Promise<void>;
  /** Create a user, then reload the first page. */
  createUser: (input: UserCreate) => Promise<UserMutationResult<HermesUser>>;
  /** Patch a user and replace it in the loaded list. */
  updateUser: (
    id: number,
    patch: UserPatch,
  ) => Promise<UserMutationResult<HermesUser>>;
  /** Delete a user and drop it from the loaded list. */
  deleteUser: (id: number) => Promise<UserMutationResult<null>>;
  /** Set a user's password. Resolves 204 as a success. */
  setPassword: (
    id: number,
    change: PasswordChange,
  ) => Promise<UserMutationResult<null>>;
}

const inFlightRequests = new Map<string, Promise<UserPage>>();

async function readProblem(res: Response, fallback: string) {
  const data = await res.json().catch(() => null);
  return parseProblem(data, fallback);
}

/**
 * List users and run the admin user operations.
 *
 * Backed by the shell's `/api/users` proxy, which forwards to the station's
 * `GET/POST/PATCH/DELETE /api/v2/users*` endpoints. The daemon enforces
 * authorization; this hook only surfaces its success and problem responses.
 *
 * @example
 * const users = useUsers();
 * await users.createUser({ username: 'pu2uit', password: 'long-password' });
 */
export function useUsers(): UsersState {
  const [users, setUsers] = useState<HermesUser[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchPage = useCallback(async (cursor: string | null, reset: boolean) => {
    const cacheKey = cursor ?? 'users:first';
    const url = cursor
      ? `/api/users?cursor=${encodeURIComponent(cursor)}`
      : '/api/users';

    const existing = inFlightRequests.get(cacheKey);
    if (existing) {
      const page = await existing;
      if (mountedRef.current) {
        setUsers((prev) => (reset ? page.data : [...prev, ...page.data]));
        setNextCursor(page.next_cursor ?? null);
      }
      return;
    }

    const promise = fetch(url).then(async (res) => {
      if (!res.ok) {
        const problem = await readProblem(res, 'Failed to fetch users');
        throw new Error(problem.message);
      }
      return (await res.json()) as UserPage;
    });

    inFlightRequests.set(cacheKey, promise);
    try {
      const page = await promise;
      if (mountedRef.current) {
        setUsers((prev) => (reset ? page.data : [...prev, ...page.data]));
        setNextCursor(page.next_cursor ?? null);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch users');
      }
      throw err;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchPage(null, true);
    } catch {
      // Error already surfaced via fetchPage.
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      await fetchPage(nextCursor, false);
    } catch {
      // Error already surfaced via fetchPage.
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, fetchPage]);

  const createUser = useCallback(
    async (input: UserCreate): Promise<UserMutationResult<HermesUser>> => {
      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const problem = parseProblem(data, 'Failed to create user');
          return {
            ok: false,
            message: problem.message,
            fieldErrors: problem.fieldErrors,
          };
        }
        await refresh();
        return { ok: true, data: data as HermesUser };
      } catch (err) {
        return {
          ok: false,
          message: err instanceof Error ? err.message : 'Failed to create user',
          fieldErrors: {},
        };
      }
    },
    [refresh],
  );

  const updateUser = useCallback(
    async (
      id: number,
      patch: UserPatch,
    ): Promise<UserMutationResult<HermesUser>> => {
      try {
        const res = await fetch(`/api/users/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const problem = parseProblem(data, 'Failed to update user');
          return {
            ok: false,
            message: problem.message,
            fieldErrors: problem.fieldErrors,
          };
        }
        const updated = data as HermesUser;
        if (mountedRef.current) {
          setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
        }
        return { ok: true, data: updated };
      } catch (err) {
        return {
          ok: false,
          message: err instanceof Error ? err.message : 'Failed to update user',
          fieldErrors: {},
        };
      }
    },
    [],
  );

  const deleteUser = useCallback(
    async (id: number): Promise<UserMutationResult<null>> => {
      try {
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const problem = await readProblem(res, 'Failed to delete user');
          return {
            ok: false,
            message: problem.message,
            fieldErrors: problem.fieldErrors,
          };
        }
        if (mountedRef.current) {
          setUsers((prev) => prev.filter((u) => u.id !== id));
        }
        return { ok: true, data: null };
      } catch (err) {
        return {
          ok: false,
          message: err instanceof Error ? err.message : 'Failed to delete user',
          fieldErrors: {},
        };
      }
    },
    [],
  );

  const setPassword = useCallback(
    async (
      id: number,
      change: PasswordChange,
    ): Promise<UserMutationResult<null>> => {
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
    [],
  );

  useEffect(() => {
    const id = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(id);
  }, [refresh]);

  return {
    users,
    nextCursor,
    loading,
    loadingMore,
    error,
    refresh,
    loadMore,
    createUser,
    updateUser,
    deleteUser,
    setPassword,
  };
}
