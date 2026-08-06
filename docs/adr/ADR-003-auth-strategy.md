# ADR-003: Authentication Strategy

**Status**: Accepted  
**Date**: 2026-08-06  
**Deciders**: Frontend Architect, Senior Project Manager

---

## Context

Three independently deployable apps (`hermes-shell`, `hermes-gps-final`, `hermes-chat-final`) share a single authentication domain. Users log in once via `hermes-shell` and should be automatically authenticated when navigating to `/gps` or `/chat` without re-entering credentials.

The [hermes-backend](https://github.com/Rhizomatica/hermes-backend) issues JWT RS256 token pairs (access token 15min, refresh token 7 days). The frontend must store these securely and share them across all three apps on the same origin.

In development, apps run on different ports (`localhost:4000`, `:4001`, `:4002`), which means cookies are port-specific and won't be shared automatically.

## Decision

**Primary (production): HttpOnly cookie set at root path (`/`)**.

**Fallback (development): `localStorage` with Content-Security-Policy mitigations**.

The `@hermes/shared-auth` package abstracts the storage backend behind a `TokenStore` interface, so apps never know or care which backend is active.

### Architecture

```
┌────────────────────────────────────────────────┐
│              @hermes/shared-auth                │
│                                                 │
│  TokenStore (interface)                         │
│  ├── getAccessToken(): string | null            │
│  ├── getRefreshToken(): string | null           │
│  ├── setTokens(access, refresh): void           │
│  ├── clearTokens(): void                        │
│  └── getUser(): HermesUser | null               │
│                                                 │
│  Implementations:                               │
│  ├── CookieTokenStore   (production)            │
│  └── LocalStorageTokenStore (dev fallback)      │
│                                                 │
│  Auto-detection:                                │
│  if (document.cookie includes 'hermes_token')    │
│    → CookieTokenStore                           │
│  else → LocalStorageTokenStore                  │
└────────────────────────────────────────────────┘
```

### Login Flow

1. User visits `hermes-shell` → no valid token → redirected to `/login`
2. User submits credentials → `POST /api/auth/login` (proxied to `hermes-backend`)
3. Backend returns `{ accessToken, refreshToken, user }`
4. Proxy route handler sets `Set-Cookie: hermes_token=<access>; Path=/; HttpOnly; Secure; SameSite=Strict` and `Set-Cookie: hermes_refresh=<refresh>; Path=/; HttpOnly; Secure; SameSite=Strict`
5. In development (no cookie support across ports), falls back to `localStorage.setItem('hermes_tokens', JSON.stringify({ access, refresh }))`
6. `AuthProvider` stores `HermesUser` in React state (not localStorage — derived from token validation)

### Token Refresh (Single-Flight Pattern)

1. Every authenticated API request is wrapped with an interceptor
2. If request returns `401`, interceptor calls `POST /api/auth/refresh` with the refresh token
3. If refresh succeeds, new tokens are stored and the original request is retried
4. If refresh fails (refresh token expired), `AuthProvider` clears state and redirects to `/login`

**Race condition mitigation**: Multiple concurrent `401` responses (e.g., page load triggers 3 API calls) must not trigger concurrent refresh calls. A **single-flight mutex** ensures only one refresh call is in-flight at any time:

```typescript
let refreshPromise: Promise<boolean> | null = null;

async function refreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;          // Reuse in-flight refresh
  refreshPromise = doRefresh()
    .then(() => true)
    .catch(() => false)
    .finally(() => { refreshPromise = null; });       // Clear mutex
  return refreshPromise;
}
```

All concurrent `401` responses share the same refresh promise. If the refresh succeeds, all original requests are retried. If it fails (refresh token expired or revoked), all callers receive the failure and the user is redirected to login once.

### Cross-App Auth

All three apps are served from the same origin in production (`hermes.station.local`):

```
hermes.station.local/        → hermes-shell (port 4000)
hermes.station.local/gps/    → hermes-gps-final (port 4001)
hermes.station.local/chat/   → hermes-chat-final (port 4002)
```

Cookies set on `Path=/` are sent to all three paths. Each app reads the cookie on mount, validates the token with `GET /api/auth/me`, and either renders the app or redirects to shell login.

### Auth Provider API

```typescript
// packages/shared-auth/src/AuthProvider.tsx
<AuthProvider>
  {children}  {/* has access to useAuth() */}
</AuthProvider>

// packages/shared-auth/src/useAuth.ts
function useAuth(): {
  user: HermesUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login(email: string, password: string): Promise<void>;
  logout(): void;
}

// packages/shared-auth/src/useAuthGuard.ts
function useAuthGuard(): HermesUser {
  // Redirects to shell login if not authenticated
  // Returns user once authenticated (type-narrowed)
}
```

## Consequences

### Positive
- Single login grants access to all apps — no per-app credential re-entry
- HttpOnly cookies are inaccessible to JavaScript (XSS cannot steal tokens in production)
- `TokenStore` abstraction allows adding Capacitor Secure Storage as a third backend in the future
- Dev fallback to localStorage with CSP headers (`script-src 'self'`) mitigates XSS risk during development

### Negative
- Cookie-based auth requires same-origin deployment — cross-origin GPS/Chat deployments need CORS + cookie `SameSite=None`
- Token refresh adds latency to first request after expiry (one extra round-trip)
- `localStorage` fallback in dev is less secure than cookie — developers must be aware of this

### Mitigations
- `SameSite=Strict` in production prevents CSRF
- Access token lifetime of 15min limits exposure window if stolen
- CSP headers with `script-src 'self'` prevent inline script injection in dev
- `AuthProvider` validates token on mount and on every route change (via Next.js router events)

## Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| OAuth2/OIDC with external provider | HF radio stations have no internet — must be fully self-hosted auth |
| Session-based auth (server-side sessions) | Requires sticky sessions in load-balanced deployments; JWT is stateless |
| Only `localStorage` (no cookie) | XSS-vulnerable — any injected script can read tokens |
| Only cookie (no localStorage fallback) | Development across multiple ports is broken without a reverse proxy |

## References

- hermes-backend auth: JWT RS256 access + refresh token pair
- OWASP JWT Cheat Sheet: `https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html`
- Frontend Architect agent: `§Client-Side Security`