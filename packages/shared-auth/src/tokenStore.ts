/**
 * TokenStore abstraction (ADR-003).
 *
 * Tokens (`hermes_token`, `hermes_refresh`) are HttpOnly cookies set by the API
 * proxy and are unreadable from JavaScript in production. In development there
 * is no cookie proxy for the token pair, so a localStorage fallback holds the
 * bearer tokens.
 *
 * The user identity (`hermes_user`) is a client-readable, host-scoped cookie
 * (NOT port-scoped, unlike localStorage), which is how the shell, GPS, and chat
 * apps — each on their own dev port — share the display identity. It carries no
 * authorization claims (`role`, `status`); authoritative identity always comes
 * from `GET /api/auth/me`.
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
// Cookies (host-scoped, shared across sub-apps)
// ------------------------------------------------------------------

const COOKIE_ACCESS = 'hermes_token';
const COOKIE_REFRESH = 'hermes_refresh';
const COOKIE_USER = 'hermes_user';

const LS_ACCESS = 'hermes_access';
const LS_REFRESH = 'hermes_refresh';

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

/** Read the display-only user from the host-scoped cookie. */
function readCachedUser(): CachedUser | null {
  const raw = getCookie(COOKIE_USER);
  if (!raw) return null;
  try {
    return toCachedUser(JSON.parse(decodeURIComponent(raw)) as CachedUser);
  } catch {
    return null;
  }
}

/** Persist the display-only user to the host-scoped cookie. */
function writeCachedUser(user: CachedUser): void {
  if (typeof document === 'undefined') return;
  const json = encodeURIComponent(JSON.stringify(toCachedUser(user)));
  document.cookie = `${COOKIE_USER}=${json}; Path=/; SameSite=Lax; Max-Age=604800`;
}

// ------------------------------------------------------------------
// CookieTokenStore — production path
// ------------------------------------------------------------------

export const cookieTokenStore: TokenStore = {
  // Tokens are HttpOnly — inaccessible from JavaScript.
  getAccessToken() {
    return null;
  },
  getRefreshToken() {
    return null;
  },
  setTokens(_access: string, _refresh: string) {
    // Cookies are set by the API proxy via Set-Cookie headers — no-op.
  },
  clearTokens() {
    if (typeof document !== 'undefined') {
      for (const name of [COOKIE_ACCESS, COOKIE_REFRESH, COOKIE_USER]) {
        document.cookie = `${name}=; Path=/; Max-Age=0`;
      }
    }
  },
  getUser: readCachedUser,
  setUser: writeCachedUser,
};

// ------------------------------------------------------------------
// LocalStorageTokenStore — dev fallback
// ------------------------------------------------------------------

export const localStorageTokenStore: TokenStore = {
  getAccessToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(LS_ACCESS);
  },
  getRefreshToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(LS_REFRESH);
  },
  setTokens(access: string, refresh: string) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(LS_ACCESS, access);
    localStorage.setItem(LS_REFRESH, refresh);
  },
  clearTokens() {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(LS_ACCESS);
    localStorage.removeItem(LS_REFRESH);
    // Also clear the host-scoped user cookie if present.
    if (typeof document !== 'undefined') {
      document.cookie = `${COOKIE_USER}=; Path=/; Max-Age=0`;
    }
  },
  getUser: readCachedUser,
  setUser: writeCachedUser,
};

// ------------------------------------------------------------------
// Auto-detection
// ------------------------------------------------------------------

export function detectTokenStore(): TokenStore {
  // In dev, the token pair lives in localStorage when no cookie proxy exists.
  // The presence of a locally stored access token indicates the dev fallback.
  if (typeof localStorage !== 'undefined' && localStorage.getItem(LS_ACCESS)) {
    return localStorageTokenStore;
  }
  return cookieTokenStore;
}