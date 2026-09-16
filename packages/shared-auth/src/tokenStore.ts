/**
 * TokenStore abstraction (ADR-003).
 *
 * CookieTokenStore for production (HttpOnly cookies set by API proxy).
 * LocalStorageTokenStore for dev fallback.
 * Auto-detection based on cookie presence.
 */

export interface HermesUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface TokenStore {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setTokens(access: string, refresh: string): void;
  clearTokens(): void;
  getUser(): HermesUser | null;
  setUser(user: HermesUser): void;
}

// ------------------------------------------------------------------
// CookieTokenStore — production path
// ------------------------------------------------------------------

const COOKIE_ACCESS = 'hermes_token';
const COOKIE_REFRESH = 'hermes_refresh';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export const cookieTokenStore: TokenStore = {
  getAccessToken() {
    return getCookie(COOKIE_ACCESS);
  },
  getRefreshToken() {
    return getCookie(COOKIE_REFRESH);
  },
  setTokens(_access: string, _refresh: string) {
    // Cookies are set by API proxy via Set-Cookie headers
    // Client cannot write HttpOnly cookies — no-op
  },
  clearTokens() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('hermes_user');
    }
  },
  getUser(): HermesUser | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('hermes_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as HermesUser;
    } catch {
      return null;
    }
  },
  setUser(user: HermesUser) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('hermes_user', JSON.stringify(user));
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
  getUser(): HermesUser | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('hermes_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as HermesUser;
    } catch {
      return null;
    }
  },
  setUser(user: HermesUser) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('hermes_user', JSON.stringify(user));
    }
  },
};

// ------------------------------------------------------------------
// Auto-detection
// ------------------------------------------------------------------

export function detectTokenStore(): TokenStore {
  if (typeof document !== 'undefined' && getCookie(COOKIE_ACCESS)) {
    return cookieTokenStore;
  }
  return localStorageTokenStore;
}