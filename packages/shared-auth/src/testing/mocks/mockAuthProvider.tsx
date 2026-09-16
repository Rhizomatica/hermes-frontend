'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { AuthContextValue } from '../../AuthProvider';
import type { HermesUser } from '../../tokenStore';

const MockAuthContext = createContext<AuthContextValue | null>(null);

export interface MockAuthConfig {
  user?: HermesUser | null;
  isLoading?: boolean;
  error?: string | null;
}

export function mockAuthProvider({
  children,
  config,
}: {
  children: ReactNode;
  config: MockAuthConfig;
}) {
  const value = useMemo<AuthContextValue>(
    () => ({
      user: config.user ?? null,
      isAuthenticated: config.user != null,
      isLoading: config.isLoading ?? false,
      error: config.error ?? null,
      login: async () => {},
      logout: () => {},
    }),
    [config],
  );

  return <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>;
}

export function useMockAuth(): AuthContextValue {
  const ctx = useContext(MockAuthContext);
  if (!ctx) throw new Error('useMockAuth must be used within mockAuthProvider');
  return ctx;
}