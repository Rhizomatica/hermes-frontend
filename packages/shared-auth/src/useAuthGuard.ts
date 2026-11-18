'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { HermesUser } from '@hermes/api';
import { useAuth } from './AuthProvider';
import { APP_PORTS, appOrigin, appUrl } from './appUrls';

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

  useEffect(() => {
    if (isLoading || isAuthenticated) return;

    // The login page lives on the shell app. Derive it at runtime so no station
    // address is baked into the bundle.
    const loginUrl = appUrl('shell', '/login') ?? '/login';
    // Cross-origin shells can't use router.replace — use window.location instead.
    // Compare exact origins (not string prefixes) to avoid conflating hosts that
    // share a prefix (e.g. localhost:400 vs localhost:4001).
    const shellOrigin = appOrigin(APP_PORTS.shell);
    const isCrossOrigin = shellOrigin ? !isSameOrigin(window.location.origin, shellOrigin) : false;

    if (isCrossOrigin) {
      window.location.assign(loginUrl);
    } else {
      router.replace(loginUrl);
    }
  }, [isLoading, isAuthenticated, router]);

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
