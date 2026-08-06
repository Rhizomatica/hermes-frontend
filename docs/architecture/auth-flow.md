# HERMES Frontend — Authentication Flow

**Project**: hermes-fronted
**Last Updated**: 2026-08-06
**Version**: 1.0.0

---

## 1. Overview

Authentication in the Hermes frontend uses JWT RS256 token pairs (access token 15min, refresh token 7 days) issued by [hermes-backend](https://github.com/Rhizomatica/hermes-backend). Three independently deployable apps share a single login session via HttpOnly cookies (production) or localStorage (development).

---

## 2. Token Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                      Token Lifecycle                             │
│                                                                  │
│  ┌──────────┐    POST /auth/login    ┌──────────────────────┐   │
│  │  Login   │ ──────────────────────→│  hermes-backend      │   │
│  │  Page    │                        │                      │   │
│  │          │←──── { accessToken,    │  Issues JWT RS256:   │   │
│  │          │        refreshToken,   │  • access: 15min TTL │   │
│  │          │        user }          │  • refresh: 7d TTL   │   │
│  └────┬─────┘                        └──────────────────────┘   │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Token Storage                            │   │
│  │                                                           │   │
│  │  Production:  HttpOnly Cookie                             │   │
│  │  • hermes_token=<access>; Path=/; HttpOnly; Secure;      │   │
│  │    SameSite=Strict                                        │   │
│  │  • hermes_refresh=<refresh>; Path=/; HttpOnly; Secure;   │   │
│  │    SameSite=Strict                                        │   │
│  │                                                           │   │
│  │  Development: localStorage                                │   │
│  │  • hermes_tokens: { access, refresh, user }              │   │
│  └──────────────────────────────────────────────────────────┘   │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Token Usage                              │   │
│  │                                                           │   │
│  │  Every API request:                                       │   │
│  │  • Cookie: hermes_token=<access>  (production)            │   │
│  │  • Authorization: Bearer <access> (development)           │   │
│  │                                                           │   │
│  │  On 401 response:                                         │   │
│  │  • POST /auth/refresh with refresh_token                  │   │
│  │  • Store new tokens                                       │   │
│  │  • Retry original request                                 │   │
│  │                                                           │   │
│  │  On refresh failure:                                      │   │
│  │  • Clear all tokens                                       │   │
│  │  • Redirect to /login                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Login Flow (Detailed)

### 3.1 Sequence Diagram

```
Browser                    hermes-shell              hermes-backend
  │                             │                         │
  │  GET /                      │                         │
  │ ──────────────────────────→│                         │
  │                             │ Check cookie/token      │
  │                             │ No valid token          │
  │  302 /login                 │                         │
  │ ←──────────────────────────│                         │
  │                             │                         │
  │  GET /login                 │                         │
  │ ──────────────────────────→│                         │
  │                             │                         │
  │  Render login form          │                         │
  │ ←──────────────────────────│                         │
  │                             │                         │
  │  POST /api/auth/login       │                         │
  │  { email, password }        │                         │
  │ ──────────────────────────→│                         │
  │                             │  POST /auth/login       │
  │                             │  { email, password }    │
  │                             │ ───────────────────────→│
  │                             │                         │
  │                             │    200 { accessToken,   │
  │                             │         refreshToken,   │
  │                             │         user }          │
  │                             │ ←───────────────────────│
  │                             │                         │
  │                             │ Set-Cookie:             │
  │                             │  hermes_token=<access>  │
  │                             │  hermes_refresh=<refr>  │
  │                             │                         │
  │  200 { user }               │                         │
  │  Set-Cookie: hermes_token   │                         │
  │  Set-Cookie: hermes_refresh │                         │
  │ ←──────────────────────────│                         │
  │                             │                         │
  │  Store in AuthProvider      │                         │
  │  Redirect to / (app select) │                         │
  │                             │                         │
  │  GET /                      │                         │
  │ ──────────────────────────→│                         │
  │  Cookie: hermes_token       │                         │
  │                             │  GET /auth/me           │
  │                             │  Cookie: hermes_token   │
  │                             │ ───────────────────────→│
  │                             │    200 { user }         │
  │                             │ ←───────────────────────│
  │  Render app selector        │                         │
  │ ←──────────────────────────│                         │
```

### 3.2 Auth Provider State Machine

```
                    ┌──────┐
                    │ IDLE │  (initial state, no check performed)
                    └──┬───┘
                       │
                       │ AuthProvider mounts
                       ▼
                 ┌──────────┐
                 │ LOADING  │  (validating existing token)
                 └────┬─────┘
                      │
            ┌─────────┴─────────┐
            │                   │
            ▼                   ▼
   ┌────────────────┐   ┌────────────────┐
   │ AUTHENTICATED  │   │UNAUTHENTICATED │
   │                 │   │                │
   │ user: HermesUser│   │ user: null     │
   └───────┬─────────┘   └───────┬────────┘
           │                     │
           │ logout()            │ login()
           │                     │
           └──────────┬──────────┘
                      │
                      ▼
                 ┌──────────┐
                 │ LOADING  │
                 └──────────┘
```

---

## 4. Cross-App Auth Flow

### 4.1 Co-Deployed Mode (Production)

All three apps served from same origin via nginx reverse proxy:

```
                    nginx (station.local)
                           │
            ┌──────────────┼──────────────┐
            │              │              │
        / (root)       /gps/*        /chat/*
            │              │              │
      hermes-shell   hermes-gps-    hermes-chat-
      :4000          final :4001    final :4002
```

1. User logs in at `station.local/login` (served by `hermes-shell`)
2. Login response sets `hermes_token` cookie with `Path=/`
3. User navigates to `station.local/gps` (served by `hermes-gps-final`)
4. Browser sends `hermes_token` cookie automatically (same origin)
5. GPS app's `AuthProvider` validates token: `GET /api/auth/me` via cookie
6. GPS app renders — no login prompt

### 4.2 Standalone Mode (Single App)

A single app deployed at root:

```
                    nginx (station.local)
                           │
                      / (root)
                           │
                    hermes-gps-final :4001
```

1. User visits `station.local/`
2. GPS app's `AuthProvider` checks for token → no token found
3. `useAuthGuard` redirects to `/login` (GPS app's own login page)
4. User logs in → token stored → redirected to `/`
5. GPS app renders

### 4.3 Dev Mode (Different Ports)

```
localhost:4000 (shell)
localhost:4001 (gps)
localhost:4002 (chat)
```

Cookies are port-specific — cross-port auth doesn't work with cookies. `@hermes/shared-auth` detects dev mode (no `hermes_token` cookie present) and falls back to `localStorage`:

1. User logs in at `localhost:4000/login`
2. Tokens stored in `localStorage` under key `hermes_tokens`
3. User navigates to `localhost:4001` manually
4. GPS app reads `localStorage` (same domain `localhost`, different port — localStorage IS shared across ports on same domain!)
5. GPS app validates token → renders

> **Note**: `localStorage` is shared across ports on the same domain (`localhost`). This makes dev mode work seamlessly without a local reverse proxy.

---

## 5. Token Refresh Flow

```
App makes API request
    │
    ▼
Add auth header/cookie
    │
    ▼
Send request
    │
    ▼
Response status?
    │
┌───┴───┐
│ 2xx   │          │ 401   │
└───┬───┘          └───┬───┘
    │                  │
Return data       Is this the first retry?
                      │
                 ┌────┴────┐
                 │ Yes     │ No (already retried)
                 └────┬────┘
                      │           │
            POST /auth/refresh    │
            with refresh_token    │
                      │           │
                 ┌────┴────┐      │
                 │ 200     │ 401  │
                 └────┬────┘      │
                      │           │
            Store new tokens      │
            Retry original req    │
                      │           │
                      └─────┬─────┘
                            │
                     Clear all tokens
                     Redirect to /login
```

### Refresh Interceptor Implementation

The interceptor lives in `@hermes/shared-auth` and wraps every API call:

```typescript
// packages/shared-auth/src/apiInterceptor.ts
async function authenticatedRequest(
  path: string,
  method: string,
  body?: unknown,
): Promise<Response> {
  const response = await fetch(path, {
    method,
    headers: { ...authHeader() },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      // Retry with new token
      return fetch(path, {
        method,
        headers: { ...authHeader() },
        body: body ? JSON.stringify(body) : undefined,
      });
    }
    // Refresh failed — trigger logout
    await logout();
    throw new AuthError('Session expired');
  }

  return response;
}
```

---

## 6. Logout Flow

```
User clicks "Logout"
    │
    ▼
useAuth.logout()
    │
    ├── Clear CookieTokenStore or LocalStorageTokenStore
    ├── Clear IndexedDB offline message queue
    ├── Clear module-level API caches
    ├── Close WebSocket connection
    ├── Set AuthProvider state to UNAUTHENTICATED
    │
    ▼
Redirect to /login
```

### What gets cleared on logout:

| Storage | Data Cleared | Reason |
|---|---|---|
| Cookie / localStorage | Access + refresh tokens | Prevent token reuse |
| React state (AuthProvider) | `user` object | Force re-authentication |
| localStorage | `hermes_theme` (kept) | Theme preference persists across sessions |
| localStorage | `hermes_locale` (kept) | Locale preference persists across sessions |
| localStorage | `hermes_gps_cache` (cleared) | Last known GPS data tied to session |
| IndexedDB | Offline message queue (cleared) | Messages belong to authenticated user |
| Module caches | All API response caches (cleared) | Prevent stale data for new user |
| WebSocket | Connection closed | Prevent data leakage to new session |

---

## 7. Security Considerations

| Concern | Mitigation |
|---|---|
| XSS token theft | HttpOnly cookies (JS can't read); CSP `script-src 'self'` |
| CSRF | `SameSite=Strict` on cookies; JWT in cookie (not automatically sent by forms) |
| Token replay | Short-lived access token (15min); refresh token rotation (backend) |
| Token leakage in logs | Never log tokens; Pino redacts `cookie` header in production |
| Session fixation | Regenerate tokens on login (backend); clear all state on logout |
| localStorage XSS (dev mode) | CSP headers in dev; dev-only fallback — not used in production |

---

## 8. Environment Variables

| Variable | Default | Description |
|---|---|---|
| `HERMES_API_URL` | `https://station.local` | hermes-backend base URL |
| `NEXT_PUBLIC_SHELL_URL` | `http://localhost:4000` | Shell app URL (for redirects from sub-apps) |
| `NEXT_PUBLIC_LOGIN_URL` | `/login` | Login page path |
| `NEXT_PUBLIC_COOKIE_DOMAIN` | (empty) | Cookie domain scope (empty = current origin) |

---

## 9. References

- [ADR-003: Authentication Strategy](../adr/ADR-003-auth-strategy.md)
- [ADR-007: Multi-App Deployment](../adr/ADR-007-multi-app-deployment.md)
- [Frontend Overview](./frontend-overview.md)
- [hermes-backend Auth API](https://github.com/Rhizomatica/hermes-backend)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)