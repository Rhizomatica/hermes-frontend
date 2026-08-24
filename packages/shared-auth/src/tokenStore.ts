/**
 * TokenStore abstraction (ADR-003).
 *
 * In production, access/refresh tokens are HttpOnly cookies set by the API
 * proxy and are therefore unreadable from JavaScript. The client must NOT
 * read or echo tokens; it bootstraps identity via `GET /api/auth/me`, which
 * the server resolves against the HttpOnly cookie. `getAccessToken()` and
 * `getRefreshToken()` are retained only for the development localStorage
 * fallback where there is no cookie proxy.
 *
 * The `hermes_user` cookie is client-readable but intentionally strips
 * authorization claims (`role`, `status`) so it cannot be forged to escalate
 * privileges. Authoritative identity/authorization always comes from
 * `GET /api/auth/me`.
 */

import { HermesUser } from '@hermes/api';

/**
 * A client-safe projection of the user persisted to the (non-HttpOnly)
 * `hermes_user` cookie. Deliberately excludes `role` and `status` so a forged
 * cookie cannot grant admin/privileged access (ADR-003 / audit F3).
 */
export type CachedUser = Pick<
  HermesUser,
  'id' | 'callsign' | 'displayName' | 'email' | 'locale' | 'avatarPath'
>;

export interface TokenStore {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setTokens(access: string, refresh: string): void;
  clearTokens(): void;
  getUser(): CachedUser | null;
  setUser(user: CachedUser): void;
}

// ------------------------------------------------------------------
// CookieTokenStore — production path
// ------------------------------------------------------------------

const COOKIE_ACCESS = 'hermes_token';
const COOKIE_REFRESH = 'hermes_refresh';
const COOKIE_USER = 'hermes_user';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}

/**
 * Strip authorization claims and JSON-only fields before persisting the user
 * to a client-writable cookie. The cookie exists only for optimistic display;
 * authorization is always re-derived from the server.
 */
function toCachedUser(user: CachedUser): CachedUser {
  const { id, callsign, displayName, email, locale, avatarPath } = user;
  return { id, callsign, displayName, email, locale, avatarPath: avatarPath ?? null };
}

export const cookieTokenStore: TokenStore = {
  // Tokens are HttpOnly — inaccessible from JavaScript. Returning null here
  // forces consumers to rely on the server-side /api/auth/me bootstrap.
  getAccessToken() {
    return null;
  },
  getRefreshToken() {
    return null;
  },
  setTokens(_access: string, _refresh: string) {
    // Cookies are set by the API proxy via Set-Cookie headers.
    // Client cannot write HttpOnly cookies — no-op.
  },
  clearTokens() {
    if (typeof document !== 'undefined') {
      const expire = '; Path=/; Max-Age=0';
      document.cookie = `${COOKIE_ACCESS}=${expire}`;
      document.cookie = `${COOKIE_REFRESH}=${expire}`;
      document.cookie = `${COOKIE_USER}=${expire}`;
    }
  },
  getUser(): CachedUser | null {
    const raw = getCookie(COOKIE_USER);
    if (!raw) return null;
    try {
      return toCachedUser(JSON.parse(decodeURIComponent(raw)) as CachedUser);
    } catch {
      return null;
    }
  },
  setUser(user: CachedUser) {
    if (typeof document !== 'undefined') {
      const json = encodeURIComponent(JSON.stringify(toCachedUser(user)));
      document.cookie = `${COOKIE_USER}=${json}; Path=/; SameSite=Lax; Max-Age=604800`;
    }
  },
};

// ------------------------------------------------------------------
// LocalStorageTokenStore — dev fallback
// ------------------------------------------------------------------

export const localStorageTokenStore: TokenStore = {
  getAccessToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('hermes_access');
  },
  getRefreshToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('hermes_refresh');
  },
  setTokens(access: string, refresh: string) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('hermes_access', access);
    localStorage.setItem('hermes_refresh', refresh);
  },
  clearTokens() {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem('hermes_access');
    localStorage.removeItem('hermes_refresh');
    localStorage.removeItem('hermes_user');
  },
  getUser(): CachedUser | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('hermes_user');
    if (!raw) return null;
    try {
      return toCachedUser(JSON.parse(raw) as CachedUser);
    } catch {
      return null;
    }
  },
  setUser(user: CachedUser) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('hermes_user', JSON.stringify(toCachedUser(user)));
    }
  },
};

// ------------------------------------------------------------------
// Auto-detection
// ------------------------------------------------------------------

export function detectTokenStore(): TokenStore {
  // In production the access token is HttpOnly and unreadable, so the cookie
  // presence check is unreliable. Choose the cookie store whenever we cannot
  // read a token via localStorage AND are not in a pure dev context; this keeps
  // the abstraction stable without exposing HttpOnly token read attempts.
  if (typeof document !== 'undefined' && getCookie(COOKIE_ACCESS)) {
    return cookieTokenStore;
  }
  return localStorageTokenStore;
}