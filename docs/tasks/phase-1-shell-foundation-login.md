# Phase 1 — Shell, Foundation & Login Task List

**Project**: hermes-fronted
**Phase Duration**: Weeks 1–2
**Prerequisites**: None
**Generated**: 2026-08-06

## Phase Objectives

Deliver a unified login experience and the shared infrastructure that all three apps (`hermes-shell`, `hermes-gps-final`, `hermes-chat-final`) depend on. At phase end, a user can log in via `hermes-shell`, see an app selector, and navigate to placeholder pages for GPS and Chat. Both sub-apps recognize the auth token and do not re-prompt for credentials.

---

## Week 1: Monorepo Scaffolding & Shared Packages

### [ ] Task 1.1.0: Configure sBitx viewport and design token constraints

**Description**: Before scaffolding any app, configure the design system for the sBitx's 7-inch 800×480 touchscreen as the canonical viewport. This includes viewport meta, touch target sizes, and self-hosted font substitution.

**Acceptance Criteria**:
- [ ] `viewport` metadata configured for 800×480: `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=false, viewportFit=cover`
- [ ] Design tokens in `@hermes/tailwind-config` include touch-target minimums: `touchTarget: '44px'` (WCAG 2.2 AAA)
- [ ] Font size base: `16px` minimum, `18px` for body text (readable on 7-inch screen in varying light)
- [ ] Google Fonts CDN references replaced with self-hosted font files in `/public/fonts/`, subset to Latin + Portuguese characters, `font-display: swap`
- [ ] Breakpoint scale starts from sBitx (0–639px) and scales up: `sm: 640px` (tablet), `md: 768px`, `lg: 1024px` (desktop)
- [ ] CSS `touch-action: manipulation` on all interactive elements (prevents 300ms delay)
- [ ] All hover-dependent UI replaced with `:active` states or `@media (hover: hover)` guards

**Files to Create/Edit**:
- `packages/tailwind-config/base.ts` — add touch target, font size, z-index tokens
- `packages/tailwind-config/sbitx.ts` — sBitx-specific breakpoints and touch tokens

**Stack Notes**: sBitx runs Chromium in kiosk mode. No `window.open()`, no `beforeunload`, single tab. Theme flash prevention script already handles `prefers-color-scheme` unavailability (reads localStorage). Self-hosted fonts eliminate the only CDN dependency (currently Geist from Google Fonts in PoC).

**Doc Reference**: ADR-008 §sBitx Hardware Profile, ADR-008 §Touch-First UI

---

### [ ] Task 1.1.1: Create `packages/shared-auth` package

**Description**: Scaffold a new Turborepo package `@hermes/shared-auth` with TypeScript strict mode, React 19, and `next-intl` peer dependency. This package will hold `AuthProvider`, `useAuth`, `useAuthGuard`, `WebSocketProvider`, `LocaleProvider`, and token storage abstractions.

**Acceptance Criteria**:
- [ ] `packages/shared-auth/package.json` with `"name": "@hermes/shared-auth"`
- [ ] `tsconfig.json` extending `tsconfig.base.json`
- [ ] Builds with `tsc --noEmit` — zero errors
- [ ] Exports an empty `index.ts` barrel file

**Files to Create/Edit**:
- `packages/shared-auth/package.json` — package manifest
- `packages/shared-auth/tsconfig.json` — TS config
- `packages/shared-auth/src/index.ts` — barrel export (empty initially)

**Stack Notes**: Use `"type": "module"` for ESM compatibility. Peer deps: `react@^19`, `next-intl@^4`.

**Doc Reference**: ADR-003 §Auth Provider API, ADR-006 §Provider Hierarchy

---

### [ ] Task 1.1.2: Create `apps/hermes-shell` — scaffold

**Description**: Scaffold a new Next.js 16 app using `create-next-app` with TypeScript, Tailwind CSS, App Router, and `next-intl`. Wire into Turborepo. Configure `next.config.ts` with `basePath` support.

**Acceptance Criteria**:
- [ ] `apps/hermes-shell/package.json` with `"name": "hermes-shell"`
- [ ] `npm run dev:shell` starts app on port 4000
- [ ] `turbo.json` includes `hermes-shell` in `dev`, `build`, and `lint` tasks
- [ ] App renders a basic page at `http://localhost:4000`
- [ ] `next.config.ts` reads `NEXT_PUBLIC_BASE_PATH` env var

**Files to Create/Edit**:
- `apps/hermes-shell/package.json` — app manifest with deps on `@hermes/api`, `@hermes/ui`, `@hermes/shared-auth`, `@hermes/tailwind-config`
- `apps/hermes-shell/next.config.ts` — basePath + Turbopack config
- `apps/hermes-shell/tsconfig.json` — extending `tsconfig.base.json`
- `apps/hermes-shell/tailwind.config.ts` — importing `@hermes/tailwind-config/base`
- `apps/hermes-shell/postcss.config.mjs` — Tailwind + autoprefixer
- `turbo.json` — add `hermes-shell` to pipeline
- `package.json` — add `"dev:shell": "turbo run dev --filter=hermes-shell"`

**Stack Notes**: Port 4000 via `next dev --port 4000`. Use `next-intl` plugin in `next.config.ts`.

**Doc Reference**: ADR-007 §Base Path Configuration

---

### [ ] Task 1.1.3: Scaffold `apps/hermes-gps-final`

**Description**: Same scaffold process as 1.1.2, but for the GPS app. Port 4001. Wire into Turborepo.

**Acceptance Criteria**:
- [ ] `apps/hermes-gps-final/` scaffolded and running on port 4001
- [ ] `npm run dev:gps` starts the app
- [ ] Shares `@hermes/tailwind-config`, `@hermes/ui`, `@hermes/shared-auth`, `@hermes/api` as dependencies

**Files to Create/Edit**:
- `apps/hermes-gps-final/package.json`
- `apps/hermes-gps-final/next.config.ts`
- `apps/hermes-gps-final/tsconfig.json`
- `apps/hermes-gps-final/tailwind.config.ts`
- `apps/hermes-gps-final/postcss.config.mjs`
- `turbo.json` — add `hermes-gps-final`
- `package.json` — add `"dev:gps": "turbo run dev --filter=hermes-gps-final"`

**Stack Notes**: Port 4001 via `next dev --port 4001`. Dependencies: `maplibre-gl` and `pmtiles` for Phase 2.

**Doc Reference**: ADR-005, ADR-007

---

### [ ] Task 1.1.4: Scaffold `apps/hermes-chat-final`

**Description**: Same scaffold process for the Chat app. Port 4002.

**Acceptance Criteria**:
- [ ] `apps/hermes-chat-final/` scaffolded and running on port 4002
- [ ] `npm run dev:chat` starts the app

**Files to Create/Edit**:
- `apps/hermes-chat-final/package.json`
- `apps/hermes-chat-final/next.config.ts`
- `apps/hermes-chat-final/tsconfig.json`
- `apps/hermes-chat-final/tailwind.config.ts`
- `apps/hermes-chat-final/postcss.config.mjs`
- `turbo.json` — add `hermes-chat-final`
- `package.json` — add `"dev:chat": "turbo run dev --filter=hermes-chat-final"`

**Stack Notes**: Port 4002 via `next dev --port 4002`. PWA setup (Service Worker + manifest) in Task 1.2.8.

**Doc Reference**: ADR-007

---

### [ ] Task 1.1.5: Add `hermes-chat` and `hermes-gps` PoC to Turborepo ignore list

**Description**: The PoC apps should not be built by Turborepo (they reference the old API and are kept as reference only). Verify they are excluded from `turbo.json` pipeline or filter them out.

**Acceptance Criteria**:
- [ ] `npm run build` does not attempt to build `hermes-chat` or `hermes-gps`
- [ ] PoC apps remain in `apps/` for reference, compile-free

**Files to Edit**:
- `turbo.json` — add `hermes-chat` and `hermes-gps` to workspace ignore pattern

**Doc Reference**: N/A

---

## Week 2: Auth & Login Implementation

### [ ] Task 1.2.1: `TokenStore` abstraction in `@hermes/shared-auth`

**Description**: Implement the `TokenStore` interface with `CookieTokenStore` (production) and `LocalStorageTokenStore` (dev fallback) implementations. The store auto-detects which backend to use based on cookie presence.

**Acceptance Criteria**:
- [ ] `TokenStore` interface: `getAccessToken()`, `getRefreshToken()`, `setTokens(access, refresh)`, `clearTokens()`, `getUser()`
- [ ] `CookieTokenStore` reads/writes via `document.cookie` (or `Set-Cookie` in SSR)
- [ ] `LocalStorageTokenStore` reads/writes via `localStorage`
- [ ] Auto-detection: checks for `hermes_token` cookie → CookieStore, else → LocalStorage
- [ ] Unit tests for both stores (Vitest)

**Files to Create/Edit**:
- `packages/shared-auth/src/tokenStore.ts` — interface + implementations + auto-detect
- `packages/shared-auth/src/tokenStore.test.ts` — unit tests

**Stack Notes**: Cookie parsing must handle `HttpOnly` (can't read HttpOnly cookies from JS — this is expected; the store only writes cookies via `Set-Cookie` headers from API proxy responses, and reads them from incoming requests in SSR).

**Doc Reference**: ADR-003 §TokenStore

---

### [ ] Task 1.2.2: `AuthProvider` + `useAuth` hook

**Description**: Implement React Context provider that manages auth state. On mount, validates existing token by calling `GET /api/auth/me` (proxied to `hermes-backend`). Exposes `login()`, `logout()`, `user`, `isAuthenticated`, `isLoading`.

**Acceptance Criteria**:
- [ ] `AuthProvider` wraps children with auth context
- [ ] On mount, if token exists, validates with `GET /api/auth/me` → sets `user` state
- [ ] If no token or validation fails, `user` is `null`, `isAuthenticated` is `false`
- [ ] `login(email, password)` → `POST /api/auth/login` → stores tokens → sets user
- [ ] `login()` throws on invalid credentials with a user-readable message
- [ ] `logout()` → clears tokens → sets user to null
- [ ] Token refresh interceptor: on `401`, attempts `POST /api/auth/refresh`, retries original request

**Files to Create/Edit**:
- `packages/shared-auth/src/AuthProvider.tsx` — context + provider component
- `packages/shared-auth/src/useAuth.ts` — consumer hook
- `packages/shared-auth/src/index.ts` — export `AuthProvider`, `useAuth`

**Stack Notes**: Use `useReducer` for state transitions: `IDLE → LOADING → AUTHENTICATED | UNAUTHENTICATED`. Provider value must be memoized with `useMemo` to prevent spurious re-renders.

**Doc Reference**: ADR-003 §Auth Provider API, ADR-006 §Provider Hierarchy

---

### [ ] Task 1.2.3: `useAuthGuard` hook

**Description**: Hook that redirects unauthenticated users to the login page. Returns `HermesUser` (type-narrowed, non-null) so consuming components don't need null checks.

**Acceptance Criteria**:
- [ ] `useAuthGuard()` checks auth state on mount
- [ ] If `isLoading`, returns `null` (caller shows `LoadingSpinner`)
- [ ] If `!isAuthenticated`, redirects to `/login` (co-deployed mode) or `/` (standalone mode with login)
- [ ] Once authenticated, returns `HermesUser` (not `HermesUser | null`)
- [ ] Works in all three apps

**Files to Create/Edit**:
- `packages/shared-auth/src/useAuthGuard.ts`
- `packages/shared-auth/src/index.ts` — add export

**Stack Notes**: Use Next.js `useRouter().replace()` for redirect. The hook reads `NEXT_PUBLIC_LOGIN_URL` env var for the login page path (defaults to `/login`).

**Doc Reference**: ADR-003 §useAuthGuard

---

### [ ] Task 1.2.4: API route proxy — `/api/auth/login` and `/api/auth/me`

**Description**: Next.js route handlers that proxy auth requests to `hermes-backend`. The login handler forwards tokens as `Set-Cookie` headers. The `/me` handler validates the token from the incoming cookie.

**Acceptance Criteria**:
- [ ] `POST /api/auth/login` — forwards email/password to backend → returns user + tokens. Sets `hermes_token` and `hermes_refresh` as `Set-Cookie` headers (HttpOnly, Secure, SameSite=Strict, Path=/).
- [ ] `GET /api/auth/me` — reads `hermes_token` cookie → validates with backend → returns user object or 401.
- [ ] `POST /api/auth/refresh` — reads `hermes_refresh` cookie → calls backend refresh → sets new cookies.
- [ ] Input validation: email is non-empty string, password is non-empty string. Return 400 on invalid input.

**Files to Create/Edit**:
- `apps/hermes-shell/src/app/api/auth/login/route.ts`
- `apps/hermes-shell/src/app/api/auth/me/route.ts`
- `apps/hermes-shell/src/app/api/auth/refresh/route.ts`

**Stack Notes**: Use `hermesPost` from `@hermes/api` (Node.js transport for SSR). Parse cookies with a lightweight parser (no `cookie` npm package — use manual parsing or Next.js `cookies()`).

**Doc Reference**: ADR-001 §Dual-mode API client, ADR-003 §Login Flow

**Blocks**: Task 1.2.2 (AuthProvider depends on these routes)

---

### [ ] Task 1.2.5: Login page in `hermes-shell`

**Description**: Build the login page UI. Form with email and password fields, submit button, error display, loading state. Dark/light theme toggle, locale toggle (en/pt). Reuses design tokens from `@hermes/tailwind-config`.

**Acceptance Criteria**:
- [ ] Email input with `<label>`, `autoComplete="username"`
- [ ] Password input with `<label>`, `autoComplete="current-password"`
- [ ] Submit button disabled while loading (shows "Signing in…")
- [ ] Error message displayed below form on invalid credentials
- [ ] Successful login redirects to app selector page (`/`)
- [ ] Theme toggle (sun/moon icon) in top-right corner
- [ ] Locale toggle (EN/PT) in top-right corner
- [ ] All user-facing strings from `next-intl` (`messages/en.json`, `messages/pt.json`)
- [ ] Accessible: keyboard submit, `aria-describedby` for error, focus trap on load
- [ ] Hermes logo displayed above form

**Files to Create/Edit**:
- `apps/hermes-shell/src/app/login/page.tsx` — login form page
- `apps/hermes-shell/messages/en.json` — `login` namespace
- `apps/hermes-shell/messages/pt.json` — `login` namespace
- `apps/hermes-shell/src/app/layout.tsx` — wrap with `AuthProvider`, `ThemeProvider`, `LocaleProvider`

**Stack Notes**: PoC reference: `apps/hermes-chat/src/app/page.tsx` (login form). Extract `useAuth` from `@hermes/shared-auth`. Use `useTheme` from `@hermes/ui`.

**Doc Reference**: PoC `apps/hermes-chat/src/app/page.tsx`, ADR-003 §Login Flow

---

### [ ] Task 1.2.6: App selector page in `hermes-shell`

**Description**: After login, show a page with buttons/links to navigate to GPS and Chat apps. Displays station name and user info. Includes logout button.

**Acceptance Criteria**:
- [ ] Uses `useAuthGuard` — redirects to `/login` if not authenticated
- [ ] Shows station identity (nodename, domain) fetched from `GET /api/sys/status`
- [ ] Shows logged-in user name
- [ ] Two large navigation cards: "GPS Viewer" → `/gps`, "Chat" → `/chat`
- [ ] Logout button — calls `logout()` from `useAuth`, redirects to `/login`
- [ ] Theme and locale toggles accessible from page
- [ ] All strings from `next-intl`
- [ ] Empty/loading states handled

**Files to Create/Edit**:
- `apps/hermes-shell/src/app/page.tsx` — app selector (home page, authenticated only)
- `apps/hermes-shell/messages/en.json` — `home` namespace
- `apps/hermes-shell/messages/pt.json` — `home` namespace

**Stack Notes**: Use `useAuthGuard` + `useAuth` from `@hermes/shared-auth`. Fetch station info from `/api/sys` (proxied to hermes-backend).

**Doc Reference**: ADR-007 §Navigation Between Apps

---

### [ ] Task 1.2.7: Auth-aware layouts for GPS and Chat apps

**Description**: Add `AuthProvider`, `ThemeProvider`, `LocaleProvider` to both `hermes-gps-final` and `hermes-chat-final` root layouts. Add a placeholder "Back to Hermes" link and auth check.

**Acceptance Criteria**:
- [ ] Both apps' `layout.tsx` wraps children with provider hierarchy: `AuthProvider` → `ThemeProvider` → `LocaleProvider`
- [ ] Both apps include `useAuthGuard` on their home page
- [ ] If not authenticated, redirect to `hermes-shell` `/login` (co-deployed) or show local login (standalone — future phase)
- [ ] Navigation bar with "← Back to Hermes" link to `/`
- [ ] Apps render a placeholder page confirming they're wired up and auth-aware

**Files to Create/Edit**:
- `apps/hermes-gps-final/src/app/layout.tsx` — providers + theme flash prevention script
- `apps/hermes-gps-final/src/app/page.tsx` — placeholder GPS page with auth guard
- `apps/hermes-chat-final/src/app/layout.tsx` — providers + theme flash prevention script
- `apps/hermes-chat-final/src/app/page.tsx` — placeholder Chat page with auth guard

**Stack Notes**: Theme flash prevention script from PoC: `apps/hermes-chat/src/app/layout.tsx` lines 29–34.

**Doc Reference**: ADR-003 §Cross-App Auth, ADR-006 §Provider Hierarchy

---

### [ ] Task 1.2.8: PWA setup — Service Worker + Web App Manifest

**Description**: Configure each app as an installable Progressive Web App. Add a Service Worker for app shell caching and a Web App Manifest for "Add to Home Screen" support. This replaces the PoC's Capacitor approach for companion devices (see ADR-009).

**Acceptance Criteria**:
- [ ] `manifest.json` in each app's `/public/` with: `name: "HERMES"`, `short_name: "HERMES"`, `start_url: "/"`, `display: "standalone"`, theme color `#f97316` (orange-500), background color `#0f172a`
- [ ] App icons: 192×192 and 512×512 PNG generated from Hermes logo
- [ ] `<link rel="manifest" href="/manifest.json">` in each app's `layout.tsx` metadata
- [ ] `sw.js` Service Worker in `/public/`: caches app shell (HTML, JS, CSS) on install, network-first for API routes, cache-first for static assets
- [ ] Service Worker registered in `layout.tsx` via `<script>` or client component
- [ ] PWA passes Lighthouse PWA audit (installable, has manifest, has registered SW)
- [ ] Capacitor dependencies (`@capacitor/cli`, `@capacitor/core`, `@capacitor/android`) removed from `hermes-chat` PoC (not carried into final apps)
- [ ] `capacitor-web/` directory and `capacitor.config.ts` removed from final apps (kept only in PoC for reference)

**Files to Create/Edit**:
- `apps/hermes-shell/public/manifest.json` — Web App Manifest
- `apps/hermes-shell/public/sw.js` — Service Worker
- `apps/hermes-shell/public/icon-192.png` — app icon
- `apps/hermes-shell/public/icon-512.png` — app icon
- `apps/hermes-gps-final/public/manifest.json`
- `apps/hermes-gps-final/public/sw.js`
- `apps/hermes-chat-final/public/manifest.json`
- `apps/hermes-chat-final/public/sw.js`
- Each app's `src/app/layout.tsx` — add manifest link + SW registration

**Stack Notes**: Service Worker scope: `/`. Cache strategy: cache-first for `/_next/static/*` (hashed filenames = immutable), network-first for `/api/*` (never cache), stale-while-revalidate for HTML pages. SW version tied to build hash via `NEXT_PUBLIC_BUILD_ID`.

**Doc Reference**: ADR-009 §Implementation, ADR-009 §Service Worker

---

### [ ] Task 1.2.9: `@hermes/shared-auth` public API boundaries + package infrastructure

**Description**: Define the public API surface of `@hermes/shared-auth` — which exports are public (stable, documented) and which are internal (subject to change). Set up the testing infrastructure directory and `createServerStateHook` factory. See `docs/governance/engineering-standards.md` §5.2 for the full barrel export specification.

**Acceptance Criteria**:
- [ ] `index.ts` barrel file exports ONLY public API: `AuthProvider`, `useAuth`, `useAuthGuard`, `WebSocketProvider`, `useWebSocket`, `LocaleProvider`, `useLocale`
- [ ] Internal modules (`tokenStore.ts`, `wsEvents.ts`) are NOT exported from barrel
- [ ] `packages/shared-auth/src/testing/` directory created with:
  - `mockAuthProvider.tsx` — wraps children with a configurable mock auth state
  - `mockWebSocket.ts` — mock `useWebSocket` that emits configurable events
  - `mockApi.ts` — mock `hermesGet`/`hermesPost` factories returning fixture data
  - `fixtures/messages.ts` — sample `Message[]` array
  - `fixtures/users.ts` — sample `HermesUser` object
- [ ] `createServerStateHook<T>(cacheKey, fetcher)` factory in `packages/shared-auth/src/lib/createServerStateHook.ts`
  - Returns a hook following the `ServerState<T>` interface (ADR-006)
  - Module-level in-flight request dedup via `Map<string, Promise<T>>`
  - Stale-while-revalidate: returns cached data immediately, refreshes in background
- [ ] Unit tests for `createServerStateHook`: cache hit, cache miss, dedup, error state, refresh

**Files to Create/Edit**:
- `packages/shared-auth/src/index.ts` — restrict to public API only
- `packages/shared-auth/src/testing/mockAuthProvider.tsx`
- `packages/shared-auth/src/testing/mockWebSocket.ts`
- `packages/shared-auth/src/testing/mockApi.ts`
- `packages/shared-auth/src/testing/fixtures/messages.ts`
- `packages/shared-auth/src/testing/fixtures/users.ts`
- `packages/shared-auth/src/lib/createServerStateHook.ts`
- `packages/shared-auth/src/lib/createServerStateHook.test.ts`

**Doc Reference**: ADR-006 §ServerState, Engineering Standards §5.2, Senior Reviewer Finding #6 + #12 + #15

---

### [ ] Task 1.2.10: Content Security Policy configuration

**Description**: Configure CSP headers in all three apps' `next.config.ts`. The sBitx's air-gapped deployment benefits from strict CSP as defense-in-depth against XSS.

**Acceptance Criteria**:
- [ ] CSP header includes: `default-src 'self'`, `script-src 'self'`, `style-src 'self' 'unsafe-inline'` (Tailwind), `img-src 'self' data: blob:` (map tiles, pasted images), `connect-src 'self' ws://localhost:* http://localhost:*`, `font-src 'self'`, `manifest-src 'self'`
- [ ] CSP configured in each app's `next.config.ts` via `headers()` function
- [ ] Tested: no CSP violations in browser console at `localhost:4000`, `:4001`, `:4002`
- [ ] `'unsafe-inline'` for styles is the ONLY exception — all other directives are strict

**Files to Create/Edit**:
- `apps/hermes-shell/next.config.ts` — add CSP headers
- `apps/hermes-gps-final/next.config.ts` — add CSP headers
- `apps/hermes-chat-final/next.config.ts` — add CSP headers

**Stack Notes**: Next.js `headers()` in `next.config.ts` for CSP. `'unsafe-inline'` for styles is required by Tailwind's JIT compiler.

**Doc Reference**: Senior Reviewer Finding #14, ADR-003 §Security

---

### [ ] Task 1.2.11: Deployment pipeline + ARM64 cross-compilation

**Description**: Define and implement the build → version → test → package → deploy pipeline for the sBitx target. Replace the generic CI-only Task 1.2.9 with a full CD pipeline. Docker is used ONLY for dev — production deploys as systemd services on the Raspberry Pi.

**Acceptance Criteria**:
- [ ] CI pipeline: lint → typecheck → unit tests → build (per app) → E2E tests on built artifacts
- [ ] ARM64 cross-compilation: builds produce `linux/arm64` binaries via `docker buildx --platform linux/arm64` OR QEMU user-mode emulation
- [ ] Build output: Next.js standalone output in `apps/<name>/.next/standalone/`
- [ ] Versioning: git tag (`v1.0.0`) + short commit hash embedded via `NEXT_PUBLIC_APP_VERSION`
- [ ] Package: `tar.gz` of standalone output, ready for sBitx deployment
- [ ] Deploy script: `scp` tar.gz to sBitx → extract → `systemctl restart hermes-<app>`
- [ ] Rollback: systemd service retains previous version; `systemctl rollback hermes-<app>` reverts
- [ ] Tested: built artifact runs on an actual Raspberry Pi 4 (or QEMU-emulated ARM64)
- [ ] `docker-compose.yml` updated: pinned image digests, `platform: linux/arm64` annotations
- [ ] `docker-compose.yml` is dev-only — documented as such in header comment

**Files to Create/Edit**:
- `.github/workflows/ci.yml` — add build + E2E + package steps
- `scripts/build-arm64.sh` — cross-compilation script
- `scripts/deploy-sbitx.sh` — scp + systemd restart script
- `scripts/rollback-sbitx.sh` — systemd rollback script
- `docker-compose.yml` — add platform annotations + dev-only comment

**Stack Notes**: `docker buildx create --name hermes-builder --driver docker-container` for multi-arch. QEMU: `docker run --rm --privileged multiarch/qemu-user-static --reset -p yes`. Node.js on ARM64 uses the same binary interface — standalone output is architecture-agnostic at the Node.js level, but native modules (if any) must be cross-compiled.

**Doc Reference**: Senior Reviewer Finding #1 + #2, ADR-008, Engineering Standards §10

---

### [ ] Task 1.2.12: IndexedDB persistence verification on sBitx Chromium kiosk

**Description**: Before implementing the offline message queue (ADR-004, Phase 3), verify that IndexedDB persists across browser restarts in Chromium kiosk mode on the Raspberry Pi. This is a known risk — some kiosk configurations clear storage on exit.

**Acceptance Criteria**:
- [ ] Test script writes test data to IndexedDB, restarts Chromium, verifies data persists
- [ ] If IndexedDB is unreliable: fallback plan documented (file-based queue via backend API)
- [ ] If IndexedDB is reliable: document the Chromium flags/configuration that enable persistence
- [ ] Storage quota measured: how much data can be stored before eviction?
- [ ] Results documented in `docs/testing/sbitx-indexeddb-report.md`

**Files to Create/Edit**:
- `scripts/test-indexeddb-persistence.html` — standalone test page
- `docs/testing/sbitx-indexeddb-report.md` — findings + configuration

**Stack Notes**: Relevant Chromium flags: `--unlimited-storage`, `--enable-persistent-storage`. Kiosk mode may use `--incognito` which clears storage. Test both modes.

**Doc Reference**: Senior Reviewer Finding #10, ADR-004

---

### [ ] Task 1.2.13: README developer onboarding guide

**Description**: Rewrite `README.md` for the final architecture. The current README describes the PoC. Replace with complete developer onboarding guide.

**Acceptance Criteria**:
- [ ] Architecture overview diagram (ASCII or image)
- [ ] Development setup: `npm install`, `.env.local` creation, `docker compose up` (for backend dependencies)
- [ ] Running individual apps: `npm run dev:shell`, `npm run dev:gps`, `npm run dev:chat`
- [ ] Running all apps: `npm run dev`
- [ ] Running tests: `npm test`, `npm run test:e2e`
- [ ] Project conventions summary: component pattern, hook pattern, i18n, a11y, commit format
- [ ] Links to all key docs: ADRs, task lists, engineering standards, architecture overview
- [ ] sBitx deployment section: how to build for ARM64, how to deploy, how to rollback

**Files to Edit**:
- `README.md` — full rewrite

**Doc Reference**: Senior Reviewer Finding #13, Engineering Standards

---

## Phase Quality Gates

- [ ] `npm run build` passes with zero TypeScript errors across all workspaces
- [ ] `npm run lint` passes with zero warnings (ESLint with strict rules from Engineering Standards §8)
- [ ] `npm test` passes with per-module coverage targets met:
  - [ ] `packages/shared-auth/` — 100% coverage on tokenStore, AuthProvider, useAuth, createServerStateHook
  - [ ] `packages/api/` — 100% coverage on normalize utilities
- [ ] ARM64 build produces running binaries (tested on Raspberry Pi or QEMU)
- [ ] Login flow E2E: visit `:4000/login` → enter credentials → redirected to app selector
- [ ] Cookie auth E2E test passes (not just localStorage dev path)
- [ ] App selector shows GPS and Chat links
- [ ] Navigating to `:4001` (GPS) shows auth-aware page (recognizes token, no re-login)
- [ ] Navigating to `:4002` (Chat) shows auth-aware page (recognizes token, no re-login)
- [ ] Logout clears session and redirects to login
- [ ] Theme toggle works and persists across all three apps (co-deployed mode)
- [ ] Locale toggle switches en↔pt and persists
- [ ] All new routes have `next-intl` message keys in both `en.json` and `pt.json`
- [ ] No `console.log` in production code paths — use Pino (or suppress via ESLint rule)
- [ ] CSP headers configured and no violations in browser console
- [ ] IndexedDB persistence verified on sBitx Chromium kiosk (or fallback plan documented)
- [ ] README rewritten with full developer onboarding guide
- [ ] `@hermes/shared-auth` barrel only exports public API — no internal modules leaked
- [ ] Test fixtures/mocks available in `packages/shared-auth/src/testing/`
- [ ] **PoC Anti-Patterns NOT carried forward** (from Engineering Standards §11):
  - [ ] No `any` types with eslint-disable
  - [ ] No raw `fetch` in component render
  - [ ] No `localStorage` for auth in production paths
  - [ ] No inline error `<p>` — always uses `ErrorBanner` from `@hermes/ui`
  - [ ] No Google Fonts CDN — all fonts self-hosted
  - [ ] No Capacitor dependencies in final apps
  - [ ] All user-facing error messages use `useTranslations()`
- [ ] All components follow the contract standard (exported Props interface + JSDoc with @example)
- [ ] All components include a11y acceptance criteria: `aria-label` on icon buttons, keyboard navigation, focus management
- [ ] All environment variables are documented in `.env.example`
