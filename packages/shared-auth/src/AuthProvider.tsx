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
import { detectTokenStore, type CachedUser, type TokenStore } from './tokenStore';

import { HermesUser } from '@hermes/api';

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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ------------------------------------------------------------------
// Provider
// ------------------------------------------------------------------

/**
 * AuthProvider — manages authentication state for the app tree.
 *
 * Option A (ADR-003): tokens are HttpOnly cookies owned by the API proxy and
 * are never read from JavaScript. On mount we validate the session with a
 * single `GET /api/auth/me`; the server resolves identity from the HttpOnly
 * cookie. A cached (display-only) user is used solely for offline grace when
 * the network is unreachable — never as proof of authentication.
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
    dispatch({ type: 'LOADING' });
    let cancelled = false;

    async function validate() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const user = (await res.json()) as HermesUser;
          // Cache a display-only projection for offline grace.
          store.setUser(user);
          if (!cancelled) dispatch({ type: 'AUTHENTICATED', user });
          return;
        }
        if (res.status === 401) {
          store.clearTokens();
          if (!cancelled) dispatch({ type: 'UNAUTHENTICATED' });
          return;
        }
        // Any other failure: fall through to offline-grace handling below.
        throw new Error(`Unexpected /api/auth/me status ${res.status}`);
      } catch {
        // Network unreachable — provide offline grace using the display-only
        // cached user when available. This keeps already-open sessions usable
        // when the daemon/backend is briefly unreachable, without trusting the
        // cache as proof of authorization (it carries no role/status).
        const cached = store.getUser() as CachedUser | null;
        if (cached && !cancelled) {
          dispatch({ type: 'AUTHENTICATED', user: cached as unknown as HermesUser });
        } else if (!cancelled) {
          dispatch({ type: 'UNAUTHENTICATED', error: 'Could not reach the server.' });
        }
      }
    }

    validate();
    return () => {
      cancelled = true;
    };
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
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        const message = err.message ?? 'Invalid credentials.';
        dispatch({ type: 'UNAUTHENTICATED', error: message });
        throw new Error(message);
      }

      // The proxy has set HttpOnly tokens; fetch authoritative identity.
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const user = (await meRes.json()) as HermesUser;
        store.setUser(user);
        dispatch({ type: 'AUTHENTICATED', user });
        return;
      }

      store.clearTokens();
      dispatch({ type: 'UNAUTHENTICATED', error: 'Could not load your profile.' });
      throw new Error('Could not load your profile.');
    },
    [store],
  );

  const logout = useCallback(async () => {
    // Clear client-readable state immediately, then have the server clear the
    // HttpOnly cookies (best-effort; a failure still logs the local session out).
    store.clearTokens();
    dispatch({ type: 'LOGOUT' });
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore — local logout already complete.
    }
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