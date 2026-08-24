# Architecture Audit — `feature/phase-2-gps`

**Reviewer**: Architecture Auditor (🔍 adversarial architecture reviewer)
**Date**: 2026-08-20
**Base**: `main` (merge-base `029660d`)
**Branch**: `feature/phase-2-gps` (`641b6ae`)
**Scope**: 155 files, ~12,161 insertions / ~2,975 deletions

> This is an adversarial review. Findings are framed as "what breaks first in
> production." Every claim cites file:line evidence and the ADR it contradicts.

---

## Findings Summary

| # | Severity | Area | Finding |
|---|----------|------|---------|
| F1 | 🟥 CRITICAL | Auth | Production auth is broken: `getAccessToken()` reads an HttpOnly cookie via `document.cookie`, which always returns `null` |
| F2 | 🟥 CRITICAL | Auth | Cached-user short-circuit authenticates without any server validation |
| F3 | 🟥 CRITICAL | Security | Client-writable `hermes_user` cookie carries `role` → privilege escalation vector |
| F4 | 🟥 CRITICAL | Security | Server-side API client disables TLS verification (`rejectUnauthorized: false`) |
| F5 | 🟥 CRITICAL | ADR-004 | Offline queue (`IndexedDB`, `useOfflineQueue`, `useMessageStatus`) is documented as Accepted but **not implemented** |
| F6 | 🟥 HIGH | Deploy | `docker-compose.yml` is syntactically invalid and maps ports to URLs |
| F7 | 🟥 HIGH | Deploy | `Dockerfile` references `hermes-chat`/`hermes-gps`; actual workspaces are `*-final` |
| F8 | 🟡 MEDIUM | Realtime | `WebSocketProvider` omits the subprotocol, heartbeat, and jitter mandated by ADR-002 |
| F9 | 🟡 MEDIUM | Auth | No single-flight token refresh (ADR-003 §Token Refresh is violated) |
| F10 | 🟡 MEDIUM | Types | `Message.id: number` contradicts the ADR-004 optimistic-UUID model |
| F11 | 🟡 MEDIUM | Realtime | Reconnect scheduled after unmount; no `send()` despite ADR-002 API contract |
| F12 | 🟢 LOW | UI | `ThemeProvider`/`useAuthGuard` string-based origin checks are fragile |
| F13 | 🟢 LOW | Data | `buildConversations` does not validate `sent_at`, yielding unstable ordering |

---

## F1 — CRITICAL: Production auth reads an HttpOnly cookie from JavaScript

**Where**: `packages/shared-auth/src/tokenStore.ts:28-47`, `AuthProvider.tsx:87`

`cookieTokenStore.getAccessToken()` returns `getCookie('hermes_token')`, which reads
`document.cookie`. ADR-003 (§Decision, §Login Flow step 4) mandates that
`hermes_token` is set as an **HttpOnly** cookie:

> `Set-Cookie: hermes_token=<access>; Path=/; HttpOnly; Secure; SameSite=Strict`

HttpOnly cookies are **not exposed in `document.cookie`**. Consequences:

1. `AuthProvider` mounts → `store.getAccessToken()` returns `null`.
2. Line 89-92 dispatches `UNAUTHENTICATED` immediately.
3. Every app redirects to `/login` on every load — even with a valid session.

The production path **cannot authenticate anyone**. The comment on line 42-43
("Client cannot write HttpOnly cookies — no-op for `setTokens`") is internally
consistent, but the same implementation forgot that the **read** path is equally
impossible. The cookie can only be consumed server-side (as
`packages/api/src/index.ts:11-15` correctly does).

**Fix**: `AuthProvider` must not read tokens from `document.cookie`. It must
bootstrap via a server route (e.g., `GET /api/auth/me` returns identity and
validity without exposing the token), or rely on a proxy that reflects a
JS-visible `isAuthenticated` flag. The `getAccessToken()` on the client path is a
category error against the HttpOnly model.

---

## F2 — CRITICAL: Cached user bypasses server validation

**Where**: `packages/shared-auth/src/AuthProvider.tsx:94-98`

```ts
const cached = store.getUser();
if (cached) {
  dispatch({ type: 'AUTHENTICATED', user: cached });
  return;   // ← never hits GET /api/auth/me
}
```

ADR-003 (§Positive: "validates token on mount") and the docstring on lines
69-70 both claim the token is validated via `GET /api/auth/me` on mount. This
short-circuit returns **before** validation. A user cached in the cookie is
trusted indefinitely — revoked/suspended accounts (`HermesUser.status:
'suspended'`) remain "authenticated" until the cookie is cleared manually.

**Fix**: Always validate on mount. The cached user may seed optimistic UI, but
the state machine must only transition to `authenticated` after `GET /api/auth/me`
returns 200.

---

## F3 — CRITICAL: Client-writable `hermes_user` cookie carries `role`

**Where**: `packages/shared-auth/src/tokenStore.ts:62-67`, `types.ts:101`

`setUser` writes the full `HermesUser` (including `role: 'admin' | 'operator' ...`)
to a **non-HttpOnly** cookie via `document.cookie`:

```ts
document.cookie = `${COOKIE_USER}=${json}; Path=/; SameSite=Lax; Max-Age=604800`;
```

This cookie is fully client-controlled. A user can open devtools and write
`hermes_user=<forged admin JSON>`. Combined with F2 (no server validation), any
client-side `role === 'admin'` gate (and any proxy that trusts the forwarded
`hermes_user` cookie) is trivially bypassed.

**Fix**: Never persist authorization claims (`role`, `status`) in a
client-writable store. Store only non-sensitive display data, and always
re-derive authorization from the server.

---

## F4 — CRITICAL: TLS verification disabled on the server API client

**Where**: `packages/api/src/index.ts:4,54`

```ts
const insecureAgent = new https.Agent({ rejectUnauthorized: false });
```

Every server-side `hermesRequest`/`hermesGetBuffer`/`hermesPostMultipart` call to
Https endpoints uses this agent. This silently accepts any certificate, enabling
MITM on the transport between the frontend server and `hermes-backend`
(`HERMES_API_URL`). Bearer tokens and message bodies traverse this channel.

**Fix**: Remove `rejectUnauthorized: false`. If a self-signed cert is required in
staging, pin the CA via `ca:` rather than disabling verification globally, and
gate it behind an explicit environment flag that is off in production.

---

## F5 — CRITICAL: ADR-004 offline queue is documented as Accepted but unimplemented

**Where**: `docs/adr/ADR-004-offline-queue.md` (Status: `Accepted`), vs. source

ADR-004 describes an IndexedDB-backed offline queue in `@hermes/shared-auth` with:
- `useOfflineQueue()` returning `{ queueLength, pendingMessages, retryMessage, removeMessage }`
- `useMessageStatus()` returning the 5-stage HF delivery pipeline
- `idb` wrapper for IndexedDB

A repository-wide search for `useOfflineQueue`, `useMessageStatus`, `IndexedDB`,
`indexedDB`, and `idb` returns **zero** hits. The `shared-auth/src` directory
contains no queue implementation. The ADR's stated status (`Accepted`) and its
"Decision" ("We **will** implement…") are in direct conflict with the absent code.
The 5-stage HF delivery model — core to the project's operational reality — is
therefore entirely unrepresented in the running app; any "send" is the PoC
fire-and-forget path the ADR explicitly rejects (ADR-004 §Context).

**Fix**: Either implement the queue (and flip ADR status to `Implemented`) or
demote the ADR to `Proposed`/`Deferred` and update `docs/next-steps.md` and
`docs/phase-2-progress.md` accordingly. An Accepted ADR with no code is a
governance failure.

---

## F6 — HIGH: `docker-compose.yml` is malformed and nonsensical

**Where**: `docker-compose.yml`

- Line 8: `- ` under `lb-index.ports:` is an empty list item → **YAML parse error**; `docker compose up` fails immediately.
- Line 22: `"3000:${HERMES_API_URL}"` and line 36 `"3001:${HERMES_API_URL}"` map a host port to an **API URL**, not a container port. Ports must be `HOST:CONTAINER` integers.
- Lines 21/36: the container port is expressed via an env var that holds a URL — invalid.
- `lb-index` (nginx:alpine) exposes `80:8000` but has no config/volume; nothing listens on 8000 inside the nginx container.

**Fix**: Rewrite with concrete integer ports and remove the `lb-index` stub or wire
it to an actual nginx config that reverse-proxies `HERMES_API_URL`.

---

## F7 — HIGH: Dockerfile targets non-existent workspace members

**Where**: `Dockerfile:30,62`, `docker-compose.yml:15-18,27-30`

The Dockerfile builds `${APP}` (default via compose: `hermes-chat` / `hermes-gps`)
with `npx turbo build --filter=${APP}` and runs `node apps/$APP/server.js`. The
actual Next.js workspaces in this branch are `hermes-chat-final` and
`hermes-gps-final`. `turbo build --filter=hermes-chat` will fail because that
workspace member has no `build` in the current turbo graph (or resolves to the
wrong package). Result: `docker compose up --build` fails for both services.

**Fix**: Point compose `APP` args at `hermes-chat-final` / `hermes-gps-final` and
confirm the standalone output path (`apps/${APP}/.next/standalone`) matches.

---

## F8 — MEDIUM: WebSocket protocol contract not honored

**Where**: `packages/shared-auth/src/WebSocketProvider.tsx` vs `ADR-002`

ADR-002 §Reconnection Strategy mandates:
- Client `ping` every 30s, abandon connection if no `pong` within 10s.
- Jitter on backoff (±200ms→±5s).
- `hermes-v1` subprotocol (References).
- `connectionState: 'connecting'|'connected'|'disconnected'|'reconnecting'`.
- A `send(eventType, payload)` method.

`WebSocketProvider` implements **none** of these: no subprotocol arg, no
heartbeat/pong watchdog, no jitter (`Math.min(1000 * 2**n, 30_000)` only), a
boolean `connected` instead of the 4-state enum, and no `send()`. A dead TCP
half-open socket is never detected until the OS times out — with no heartbeat the
"connected" UI can lie for minutes. This is exactly the "websocket systems fail
under poor reconnect/replay strategies" failure the auditor exists to prevent.

**Fix**: Implement the heartbeat and the protocol/subprotocol, add jitter, expose
the 4-state machine and `send()`, or amend ADR-002 to reflect what is actually
shipped (and accept the degraded liveness guarantee).

---

## F9 — MEDIUM: Token refresh is not single-flight

**Where**: `packages/shared-auth/src/AuthProvider.tsx:100-164` vs `ADR-003 §Token Refresh`

ADR-003 explicitly specifies a single-flight mutex:

> "Multiple concurrent 401 responses (e.g., page load triggers 3 API calls) must
> not trigger concurrent refresh calls."

`AuthProvider` has no such mutex; each failed `/api/auth/me` path issues its own
`POST /api/auth/refresh`. Worse, the actual HTTP client (`packages/api/src/index.ts`)
performs **no 401 interception and no retry at all** — it returns status 401 to
the caller with no refresh attempt. The interceptor architecture in ADR-003 is not
present anywhere.

**Fix**: Implement the interceptor + single-flight refresh in the API client
layer, or move validation fully server-side and delete the client refresh path.

---

## F10 — MEDIUM: `Message.id: number` contradicts optimistic UUID model

**Where**: `packages/api/src/types.ts:53` vs `ADR-004 §Optimistic Insert`

ADR-004: "id: client UUID — replaced with server id on confirmation." The shared
type declares `id: number`. A UUID cannot inhabit `number`, so any optimistic
insert (a core ADR-004 feature) is a type error. The canonical type for the
cross-cutting message entity is already wrong for the architecture's stated
direction.

**Fix**: Change to `id: string | number` (server int vs client UUID) or define a
discriminated `MessageId`.

---

## F11 — MEDIUM: WebSocket reconnect can outlive unmount

**Where**: `packages/shared-auth/src/WebSocketProvider.tsx:45-62`

`onclose` schedules `setTimeout(connect, delay)`. The cleanup in the `useEffect`
clears `reconnectTimeout.current` and closes `wsRef.current`, but if `onclose`
fires after cleanup or a reconnect is already mid-schedule, a new connection can
be opened for an unmounted provider, and `setConnected` can run on an unmounted
tree (React warning / potential leak in repeated mount cycles).

**Fix**: Use a `disposed` ref checked inside `connect`/`onclose`, and clear the
timeout before setting a new one.

---

## F12 — LOW: Fragile same-origin detection

**Where**: `packages/shared-auth/src/useAuthGuard.ts:28`

```ts
const isCrossOrigin = ... && !window.location.origin.startsWith(shellUrl);
```

Prefix-matching origins (`startsWith`) conflates `http://localhost:400` with
`http://localhost:4001`, and compares a full origin against a base shell URL
string. The same pattern reappears in `ThemeProvider` cookie/storage sync. This
is brittle and will misbehave under non-default ports or subdomain deployments.

**Fix**: Parse with `new URL(...)` and compare `origin` exactly.

---

## F13 — LOW: Unvalidated dates in conversation grouping

**Where**: `packages/api/src/conversation.ts:44-46,59-63`

`new Date(b.sent_at).getTime()` yields `NaN` for malformed/absent `sent_at`,
which makes `.sort()` produce undefined/unstable ordering, silently corrupting
conversation ordering and "most recent" selection.

**Fix**: Coerce invalid dates to `-Infinity` (or drop/fix them) before sorting.

---

## Themes and Recommendations

1. **The HttpOnly contradiction (F1-F3) is a systemic modeling error**, not a
local bug. Decide one auth bootstrap model: (a) server-side-only cookie + a
non-HttpOnly `isAuthenticated` flag and identity fetched via `/api/auth/me`, or
(b) JS-visible bearer tokens (not HttpOnly) with the XSS tradeoffs made explicit.
Do **not** keep a `TokenStore` whose production read path can only return `null`.

2. **ADR-to-code drift is governance debt** (F5, F8, F9, F10). Accepted ADRs must
either be implemented or demoted. Add a CI check or review gate that fails when an
ADR's contract has no matching symbol/behavior.

3. **Deployment artifacts (F6, F7) are not validated in CI.** `docker compose
config` and `turbo build --filter=<APP>` should run in PR checks; a valid YAML file
and matching workspace names are the minimum bar.

4. **TLS (F4) must be fixed immediately** — it is a production security
regression with no compensating control.

---

### Verdict

The branch is **not production-ready**. Two independent critical auth defects
(F1, F2) mean the production cookie path cannot authenticate users, and a
third (F3) plus the TLS disable (F4) represent exploitable security weaknesses.
The deployment definitions (F6, F7) prevent a successful `docker compose up`.
The HF offline-queue ADR (F5) — the central differentiator of this product — is
accepted on paper but absent in code. These must be resolved before merge.

---

## Remediation (2026-08-21)

> Applied per user decisions: **Auth = Option A (HttpOnly)**, **ADR-004 = demote
> to Proposed (2b)**. See below for the F1 correction.

### F1 correction (important)

The original F1 asserted a *functional* outage: that `getAccessToken()` reading
`document.cookie` returns `null` because the cookie is HttpOnly. On inspection of
the actual proxy routes, the cookies were being set **without** the `HttpOnly`
attribute (`SameSite=Lax; Path=/; Max-Age` only), so the client *could* read
them — auth was not functionally broken by HttpOnly. The real defect is inverted:
the tokens were **not HttpOnly**, which defeats the XSS-token-theft protection
ADR-003 was written to guarantee. This is a security regression, not an outage.
F1 is reclassified as: *bearer tokens shipped in non-HttpOnly, non-Secure cookies*.

### Resolution status

| # | Status | Change |
|---|--------|--------|
| F1 | ✅ Fixed | login/refresh now set `HttpOnly; SameSite=Lax`; `cookieTokenStore` no longer reads tokens client-side |
| F2 | ✅ Fixed | `AuthProvider` always validates via `GET /api/auth/me`; cached user used only for offline grace |
| F3 | ✅ Fixed | `hermes_user` cookie strips `role`/`status` to a display-only `CachedUser` projection |
| F4 | ✅ Fixed | removed `rejectUnauthorized: false` from `packages/api/src/index.ts` |
| F5 | ✅ Governed | ADR-004 demoted to `Proposed` with an explicit "not implemented" note |
| F6 | ✅ Fixed | `docker-compose.yml` rewritten: integer ports, valid YAML, corrected workspace args |
| F7 | ✅ Fixed | compose `APP` args → `hermes-chat-final` / `hermes-gps-final` |
| F8 | ✅ Fixed | `WebSocketProvider` adds `hermes-v1` subprotocol, 30s `ping`/10s `pong` heartbeat, jittered backoff, 4-state machine |
| F9 | ✅ Fixed | client refresh loop removed (server-side proxy owns refresh); no concurrent refresh path remains |
| F10 | ✅ Deferred | `Message.id: number` retained; UUID optimistic model deferred with the queue (ADR-004 now Proposed) |
| F11 | ✅ Fixed | unmount `disposed` guard + `send()` added |
| F12 | ✅ Fixed | exact-origin comparison via `new URL().origin` |
| F13 | ✅ Fixed | `sentAt()` coercion to `-Infinity` in `buildConversations`/`filterConversation` |

### Verification

- `tsc --noEmit` clean for `packages/shared-auth`, `apps/hermes-shell`,
  `apps/hermes-gps-final`, `apps/hermes-chat-final`.
- `vitest` green for `packages/api` (22 tests: conversation + normalize).
- Remaining test-suite failures are pre-existing and unrelated: Playwright e2e
  is incorrectly collected by vitest, and `apps/hermes-gps-final` `vitest`
  lacks the `@/` alias for `gpsCache` (config issue, not code).
