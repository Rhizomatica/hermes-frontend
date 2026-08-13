'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import { detectTokenStore, type HermesUser, type TokenStore } from './tokenStore';

// ------------------------------------------------------------------
// State
// ------------------------------------------------------------------

interface AuthState {
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  user: HermesUser | null;
  error: string | null;
}

type AuthAction =
  | { type: 'LOADING' }
  | { type: 'AUTHENTICATED'; user: HermesUser }
  | { type: 'UNAUTHENTICATED'; error?: string }
  | { type: 'LOGOUT' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOADING':
      return { ...state, status: 'loading', error: null };
    case 'AUTHENTICATED':
      return { status: 'authenticated', user: action.user, error: null };
    case 'UNAUTHENTICATED':
      return { status: 'unauthenticated', user: null, error: action.error ?? null };
    case 'LOGOUT':
      return { status: 'unauthenticated', user: null, error: null };
    default:
      return state;
  }
}

// ------------------------------------------------------------------
// Context
// ------------------------------------------------------------------

export interface AuthContextValue {
  user: HermesUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (callsign: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ------------------------------------------------------------------
// Provider
// ------------------------------------------------------------------

/**
 * AuthProvider — manages authentication state for the app tree.
 *
 * On mount, validates any existing token by calling `GET /api/auth/me`.
 * Token refresh: on 401, attempts POST /api/auth/refresh, retries.
 *
 * @example
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    status: 'idle',
    user: null,
    error: null,
  });

  const store: TokenStore = useMemo(() => detectTokenStore(), []);

  useEffect(() => {
    const token = store.getAccessToken();

    if (!token) {
      dispatch({ type: 'UNAUTHENTICATED' });
      return;
    }

    const cached = store.getUser();
    if (cached) {
      dispatch({ type: 'AUTHENTICATED', user: cached });
      return;
    }

    dispatch({ type: 'LOADING' });
    let cancelled = false;

    async function validate() {
      try {
        const res = await fetch('/api/auth/me');

        if (res.ok) {
          const data = (await res.json()) as HermesUser;
          store.setUser(data);
          if (!cancelled) dispatch({ type: 'AUTHENTICATED', user: data });
          return;
        }

        // Token invalid — try refresh
        const refreshToken = store.getRefreshToken();
        if (refreshToken) {
          const refreshRes = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken }),
          });

          if (refreshRes.ok) {
            const refreshData = (await refreshRes.json()) as {
              access?: string;
              refresh?: string;
              accessToken?: string;
              refreshToken?: string;
              user: HermesUser;
            };
            const access = refreshData.access ?? refreshData.accessToken ?? '';
            const refresh = refreshData.refresh ?? refreshData.refreshToken ?? '';
            store.setTokens(access, refresh);
            store.setUser(refreshData.user);
            if (!cancelled) dispatch({ type: 'AUTHENTICATED', user: refreshData.user });
            return;
          }
        }

        store.clearTokens();
        if (!cancelled) dispatch({ type: 'UNAUTHENTICATED' });
      } catch {
        const cachedUser = store.getUser();
        if (cachedUser) {
          dispatch({ type: 'AUTHENTICATED', user: cachedUser });
        } else {
          dispatch({ type: 'UNAUTHENTICATED', error: 'Could not reach the server.' });
        }
      }
    }

    validate();
    return () => { cancelled = true; };
  }, [store]);

  const login = useCallback(
    async (callsign: string, password: string) => {
      dispatch({ type: 'LOADING' });
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callsign, password }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        const message = err.message ?? 'Invalid credentials.';
        dispatch({ type: 'UNAUTHENTICATED', error: message });
        throw new Error(message);
      }

      const data = (await res.json()) as {
        access?: string;
        refresh?: string;
        accessToken?: string;
        refreshToken?: string;
        user: HermesUser;
      };

      store.setTokens(data.access ?? data.accessToken ?? '', data.refresh ?? data.refreshToken ?? '');
      store.setUser(data.user);
      dispatch({ type: 'AUTHENTICATED', user: data.user });
    },
    [store],
  );

  const logout = useCallback(() => {
    store.clearTokens();
    dispatch({ type: 'LOGOUT' });
  }, [store]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: state.user,
      isAuthenticated: state.status === 'authenticated',
      isLoading: state.status === 'idle' || state.status === 'loading',
      error: state.error,
      login,
      logout,
    }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth — consumes the AuthContext.
 *
 * @throws if used outside AuthProvider
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}