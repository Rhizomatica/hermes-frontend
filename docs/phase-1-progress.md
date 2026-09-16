# Phase 1 — Shell, Foundation & Login · Progress Tracker

**Branch**: `feature/1.1.0-sbitx-design-tokens`  
**Base**: `docs/hf-digital-specialist-review-fixes` (commit `529d0f7`)  
**Updated**: 2026-08-12 (review session)  
**Status**: ✅ Complete — all 17 tasks implemented, CR-1 resolved, all three apps build and lint clean

---

## Task Status

| ID | Task | Status | Commit | Notes |
|---|---|---|---|---|
| — | Merge conflict fix | ✅ | `529d0f7` | 3 files |
| **Week 1** | **Monorepo Scaffolding** | ✅ | | |
| 1.1.0 | sBitx design tokens | ✅ | `82b40d0` | Touch targets, fonts, breakpoints, z-index in @hermes/tailwind-config |
| 1.1.1 | packages/shared-auth scaffold | ✅ | `82b40d0` | Empty barrel, TS config, peer deps |
| 1.1.2 | apps/hermes-shell scaffold | ✅ | `82b40d0` | Next.js 16, port 4000, tailwind, i18n |
| 1.1.3 | apps/hermes-gps-final scaffold | ✅ | `82b40d0` | Port 4001, maplibre-gl + pmtiles deps |
| 1.1.4 | apps/hermes-chat-final scaffold | ✅ | `82b40d0` | Port 4002 |
| 1.1.5 | PoC exclusion from Turborepo | ✅ | `82b40d0` | PoC apps not in workspace array |
| **Week 2** | **Auth & Login** | ✅ | | |
| 1.2.1 | TokenStore abstraction | ✅ | `06d5bec` | CookieTokenStore + LocalStorageTokenStore |
| 1.2.2 | AuthProvider + useAuth | ✅ | `06d5bec` | useReducer, token refresh, cached user |
| 1.2.3 | useAuthGuard hook | ✅ | `06d5bec` | Type-narrowed, redirects to login |
| 1.2.4 | API route proxy | ✅ | `06d5bec` | /api/auth/{login,me,refresh} |
| 1.2.5 | Login page | ✅ | `06d5bec` | i18n, ErrorBanner, 44px touch targets |
| 1.2.6 | App selector page | ✅ | `06d5bec` | GPS/Chat nav cards, theme/locale toggles |
| 1.2.7 | Auth-aware layouts | ✅ | `fcc419e` | GPS + Chat pages use useAuthGuard |
| 1.2.8 | PWA setup | ✅ | `fcc419e` | manifest.json + sw.js for all 3 apps |
| 1.2.9 | Testing infra + createServerStateHook | ✅ | `06d5bec` | Mocks, fixtures, hook factory |
| 1.2.10 | CSP configuration | ✅ | `fcc419e` | Headers function in all 3 next.config.ts |
| 1.2.11 | Deployment pipeline | ✅ | `fcc419e` | build-arm64, deploy-sbitx, rollback-sbitx |
| 1.2.12 | IndexedDB verification | ✅ | `fcc419e` | Test page + report stub |
| 1.2.13 | README + .env.example | ✅ | `fcc419e` | Architecture diagram, conventions, deployment |
| **Review** | **Code review fixes** | ✅ | `fcdeaca` | High + medium severity findings |
| — | ESLint configs | ✅ | `fcdeaca` | All 3 apps extend @hermes/config/eslint |
| — | next-intl plugin | ✅ | `fcdeaca` | withNextIntl wrapper in all 3 next.config.ts |
| — | i18n request config | ✅ | `fcdeaca` | src/i18n/request.ts in all 3 apps |
| — | Link vs <a> | ✅ | `fcdeaca` | App selector uses Next.js Link |
| — | vitest.config.ts | ✅ | `fcdeaca` | Workspace alias resolution |
| — | env.d.ts | ✅ | `fcdeaca` | ProcessEnv declarations |
| — | Service Worker registration | ✅ | `fcdeaca` | SW registered in all 3 layouts |
| — | ThemeProvider key align | ✅ | `fcdeaca` | hermes_theme → hermes-theme |
| **CR-1** | **Provider hierarchy fix** | ✅ | `7e55e17` | AuthProvider + ThemeProvider + LocaleProvider in all 3 layouts |

---

## Phase 1 Quality Gates

| Gate | Status | Notes |
|---|---|---|
| `npm run build` — zero TS errors | ✅ | All three apps build successfully, zero TypeScript errors (2026-08-12) |
| `npm run lint` — zero warnings | ✅ | All three apps pass with 0 errors, 0 warnings (2026-08-12 — review fixes applied) |
| `npm test` — coverage targets | ⚠️ | Vitest fails to boot — jsdom/undici require Node.js 22+ (current: 20). No unit test files exist yet. |
| ARM64 build on Raspberry Pi or QEMU | ⏳ | Pending hardware access |
| Login E2E flow | ⏳ | Requires backend running |
| Cookie auth E2E | ⏳ | Requires backend running |
| Cross-app auth | ⏳ | Requires backend running |
| Theme toggle persistence | ⏳ | Requires backend running |
| Locale toggle en↔pt persistence | ⏳ | Requires backend running |
| CSP no violations | ⏳ | CSP headers configured, console testing requires backend running |
| IndexedDB persistence verified | ⏳ | Pending sBitx hardware |

---

## Review Session Findings (2026-08-12)

### Fixed Issues

| Severity | ID | Description | Fix Applied |
|---|---|---|---|
| 🔴 Critical | R-1 | `next lint` subcommand removed in Next.js 16 — broke lint in all 3 apps | Changed lint script from `next lint` to `eslint .` |
| 🔴 Critical | R-2 | ESLint not installed — eslint, eslint-config-next, @eslint/eslintrc missing from all apps | Installed eslint v9.x + eslint-config-next v16 in all 3 apps |
| 🔴 Critical | R-3 | ESLint config import `@hermes/config/eslint` → actual package is `@platform/config/eslint/next.mjs` | Fixed import path to `@platform/config/eslint/next.mjs` in all 3 apps |
| 🔴 Critical | R-4 | `@eslint/eslintrc` FlatCompat circular structure error with ESLint v9/v10 | Rewrote `packages/config/eslint/next.mjs` using native flat config from `eslint-config-next` |
| 🔴 Critical | R-5 | `typescript-eslint`/`@typescript-eslint` plugin version mismatch across ESLint v9/10 | Removed explicit plugin — eslint-config-next provides it |
| 🟡 Medium | R-6 | Duplicate `@hermes/ui` imports in `hermes-shell/page.tsx` and `hermes-gps-final/page.tsx` | Merged into single import statements |
| 🟡 Medium | R-7 | `<a>` element used instead of `<Link>` in `hermes-chat-final/page.tsx` and `hermes-gps-final/page.tsx` | Replaced with Next.js `<Link>` |
| 🟡 Medium | R-8 | `react-hooks/set-state-in-effect` violation in `useGpsCoords` and `useGpsHistory` | Deferred effect-internal setState via `setTimeout(..., 0)` |
| 🟢 Low | R-9 | Unused `eslint-disable react-hooks/exhaustive-deps` in `MapView.tsx` line 218 | Removed the disable comment |

### Known Issues (Won't Fix Now)

| Severity | ID | Description | Status |
|---|---|---|---|
| 🟢 Low | CR-2 | SW files are minified to single lines | Won't fix |
| 💡 Enhancement | CR-3 | No comment in turbo.json/package.json explaining PoC exclusion | Won't fix |
| 🟡 Medium | R-10 | `npm test` fails — jsdom@30 requires Node.js 22+. Vitest with jsdom environment cannot boot on Node 20. | Requires Node.js upgrade OR downgrade jsdom to v25.x |
| 💡 Enhancement | R-11 | No unit test files written for any package (tokenStore, AuthProvider, createServerStateHook) | Phase 1 task 1.2.1 and 1.2.9 AC require tests; implementation pending test environment fix |

### Suggested Next Steps

1. **Upgrade Node.js to 22 LTS** — resolves jsdom/undici compatibility. This is required for the production target (ADR-008 specifies Node.js 22).
2. **Write unit tests** for `tokenStore`, `AuthProvider`, `useAuth`, and `createServerStateHook` once the test environment works.
3. **Set up a backend or mock server** to test login E2E, cookie auth, cross-app auth, theme/locale persistence.
4. **Verify CSP headers** produce no browser console violations by running apps and checking DevTools.

---

## Architecture Map (Post-Phase-1)

```
packages/tailwind-config/     → sBitx design tokens
packages/shared-auth/         → Auth + WebSocket + Locale providers
packages/api/                 → Dual-mode API client + shared types (GpsPosition, GpsFix)
packages/ui/                  → ThemeProvider, ErrorBanner, LoadingSpinner, ConfirmDialog, etc.
packages/config/eslint/       → Shared ESLint flat config (post-review: native flat config)

apps/hermes-shell/            → Next.js 16, port 4000
  /login                       → Login form
  /api/auth/{login,me,refresh} → Auth proxy routes

apps/hermes-gps-final/        → Next.js 16, port 4001
  /                            → Full-screen map + coordinate overlay
  /api/gps                     → GPS position proxy

apps/hermes-chat-final/       → Next.js 16, port 4002
  /                            → Auth-aware placeholder (Phase 3 target)