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
  // Compare exact origins (not string prefixes) to avoid conflating hosts that
  // share a prefix (e.g. localhost:400 vs localhost:4001).
  const isCrossOrigin =
    typeof window !== 'undefined' && shellUrl ? !isSameOrigin(window.location.origin, shellUrl) : false;

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

/**
 * Compares two URLs by exact origin. Returns true when both parse to the same
 * scheme, host, and (effective) port.
 */
function isSameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return a === b;
  }
}
