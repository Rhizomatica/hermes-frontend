'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { HermesUser } from '@hermes/api';
import { useAuth } from './AuthProvider';

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
  const shellUrl = process.env.NEXT_PUBLIC_SHELL_URL ?? '';
  const loginUrl = shellUrl
    ? `${shellUrl}${process.env.NEXT_PUBLIC_LOGIN_URL ?? '/login'}`
    : process.env.NEXT_PUBLIC_LOGIN_URL ?? '/login';

  // Cross-origin shells can't use router.replace — use window.location instead.
  const isCrossOrigin = typeof window !== 'undefined' && shellUrl && !window.location.origin.startsWith(shellUrl);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      if (isCrossOrigin) {
        window.location.assign(loginUrl);
      } else {
        router.replace(loginUrl);
      }
    }
  }, [isLoading, isAuthenticated, router, loginUrl, isCrossOrigin]);

  if (isLoading || !isAuthenticated) return null;

  return user;
}
