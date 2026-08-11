# Phase 1 — Shell, Foundation & Login · Progress Tracker

**Branch**: `feature/1.1.0-sbitx-design-tokens`  
**Base**: `docs/hf-digital-specialist-review-fixes` (commit `529d0f7`)  
**Updated**: 2026-08-11  
**Status**: ✅ Complete (with code review findings addressed)

---

## Task Status

| ID | Task | Status | Commit | Notes |
|---|---|---|---|---|
| — | Merge conflict fix | ✅ | `529d0f7` | 3 files: tsconfig.base.json, packages/config/typescript/base.json, packages/ui/src/index.ts |
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

---

## Remaining Work (Phase 1 Quality Gates)

See `docs/development-plan.md` §Phase Quality Gates (line 471):

- [ ] `npm run build` passes with zero TypeScript errors across all workspaces
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm test` passes with coverage targets
- [ ] ARM64 build produces running binaries (tested on Pi or QEMU)
- [ ] Login flow E2E: visit `:4000/login` → enter credentials → redirected to app selector
- [ ] Cookie auth E2E test passes
- [ ] App selector shows GPS and Chat links
- [ ] Navigating to `:4001` (GPS) shows auth-aware page
- [ ] Navigating to `:4002` (Chat) shows auth-aware page
- [ ] Logout clears session and redirects to login
- [ ] Theme toggle works and persists across all three apps
- [ ] Locale toggle switches en↔pt and persists
- [ ] All new routes have `next-intl` message keys in both `en.json` and `pt.json`
- [ ] No `console.log` in production code paths
- [ ] CSP headers configured and no violations in browser console
- [ ] IndexedDB persistence verified on sBitx Chromium kiosk
- [ ] README rewritten with full developer onboarding guide
- [ ] `@hermes/shared-auth` barrel only exports public API
- [ ] Test fixtures/mocks available in `packages/shared-auth/src/testing/`
- [ ] All PoC anti-patterns absent (no `any`, no Capacitor, self-hosted fonts, etc.)
- [ ] All components follow contract standard (exported Props + JSDoc @example)
- [ ] All environment variables documented in `.env.example`

---

## Known Issues (from Code Review)

| Severity | ID | Description | Status |
|---|---|---|---|
| 🔴 Critical | CR-1 | Provider hierarchy missing from all three root layouts — `useAuth()` will throw | ⚠️ Unresolved |
| 🟢 Low | CR-2 | SW files are minified to single lines — hard to debug | Won't fix (acceptable for Phase 1) |
| 💡 Enhancement | CR-3 | No comment in turbo.json/package.json explaining PoC exclusion | Won't fix |

---

## Architecture Map (Post-Phase-1)

```
packages/tailwind-config/     → sBitx design tokens
packages/shared-auth/         → Auth + WebSocket + Locale providers
packages/api/                 → Dual-mode API client (server/client)
packages/ui/                  → ThemeProvider, ErrorBanner, LoadingSpinner, ConfirmDialog, etc.

apps/hermes-shell/            → Next.js 16, port 4000
  /login                       → Login form
  /                            → App selector (GPS/Chat cards)

apps/hermes-gps-final/        → Next.js 16, port 4001
  /                            → Auth-aware placeholder

apps/hermes-chat-final/       → Next.js 16, port 4002
  /                            → Auth-aware placeholder
```

---

## Next Phase

See `docs/tasks/phase-2-gps.md` for the 12 GPS tasks.