/**
 * TokenStore abstraction (ADR-003), adapted for the station API.
 *
 * The session token is a single opaque token stored in the HttpOnly
 * `hermes_session` cookie set by the API proxy and is unreadable from
 * JavaScript. There is no refresh token.
 *
 * The user identity (`hermes_user`) is a client-readable, host-scoped cookie
 * (NOT port-scoped, unlike localStorage), which is how the shell, GPS, and chat
 * apps — each on their own dev port — share the display identity. It carries no
 * authorization claims (`role`, `disabled`); authoritative identity always comes
 * from `GET /api/auth/me`.
 */

import { HermesUser } from '@hermes/api';

/**
 * A client-safe projection of the user persisted to the (non-HttpOnly)
 * `hermes_user` cookie. Deliberately excludes `role` and `disabled` so a forged
 * cookie cannot grant admin/privileged access (ADR-003 / audit F3).
 */
export type CachedUser = Pick<
  HermesUser,
  'id' | 'username' | 'display_name' | 'locale' | 'avatar'
>;

export interface TokenStore {
  clearTokens(): void;
  getUser(): CachedUser | null;
  setUser(user: CachedUser): void;
}

const COOKIE_USER = 'hermes_user';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}

/**
 * Strip authorization claims and unknown fields before persisting the user to
 * a client-writable cookie. The cookie exists only for optimistic display;
 * authorization is always re-derived from the server.
 */
function toCachedUser(user: CachedUser): CachedUser {
  const { id, username, display_name, locale, avatar } = user;
  return { id, username, display_name, locale, avatar: avatar ?? null };
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

export const cookieTokenStore: TokenStore = {
  clearTokens() {
    if (typeof document !== 'undefined') {
      document.cookie = `${COOKIE_USER}=; Path=/; Max-Age=0`;
    }
  },
  getUser: readCachedUser,
  setUser: writeCachedUser,
};

export function detectTokenStore(): TokenStore {
  return cookieTokenStore;
}
