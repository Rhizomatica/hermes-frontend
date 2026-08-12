'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import type { HermesUser } from './tokenStore';

/**
 * useAuthGuard — redirects unauthenticated users to login.
 *
 * Returns type-narrowed HermesUser (non-null) when authenticated.
 * Returns null during loading or redirect.
 *
 * @example
 * const user = useAuthGuard();
 * if (!user) return <LoadingSpinner />;
 * return <Dashboard user={user} />;
 */
export function useAuthGuard(): HermesUser | null {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const loginUrl = process.env.NEXT_PUBLIC_LOGIN_URL ?? '/login';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(loginUrl);
    }
  }, [isLoading, isAuthenticated, router, loginUrl]);

  if (isLoading || !isAuthenticated) return null;

  return user;
}
