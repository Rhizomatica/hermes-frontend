# Phase 1 — Shell, Foundation & Login · Progress Tracker

**Branch**: `feature/1.1.0-sbitx-design-tokens`  
**Base**: `docs/hf-digital-specialist-review-fixes` (commit `529d0f7`)  
**Updated**: 2026-08-12  
**Status**: ✅ Complete — all 17 tasks implemented, CR-1 resolved, all three apps build successfully

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
| `npm run build` — zero TS errors | ✅ | All three apps build successfully (2026-08-12) |
| `npm run lint` — zero warnings | ⏳ | Not yet run |
| `npm test` — coverage targets | ⏳ | Not yet run |
| ARM64 build on Raspberry Pi or QEMU | ⏳ | Pending hardware access |
| Login E2E flow | ⏳ | Requires backend running |
| Cookie auth E2E | ⏳ | Requires backend running |
| Cross-app auth | ⏳ | Requires backend running |
| Theme toggle persistence | ⏳ | Requires backend running |
| Locale toggle en↔pt persistence | ⏳ | Requires backend running |
| CSP no violations | ⏳ | Requires backend running |
| IndexedDB persistence verified | ⏳ | Pending sBitx hardware |

---

## Known Issues

| Severity | ID | Description | Status |
|---|---|---|---|
| 🔴 Critical | CR-1 | Provider hierarchy missing from all three root layouts | ✅ Fixed (`7e55e17`) |
| 🟢 Low | CR-2 | SW files are minified to single lines | Won't fix |
| 💡 Enhancement | CR-3 | No comment in turbo.json/package.json explaining PoC exclusion | Won't fix |

---

## Architecture Map (Post-Phase-1)

```
packages/tailwind-config/     → sBitx design tokens
packages/shared-auth/         → Auth + WebSocket + Locale providers
packages/api/                 → Dual-mode API client + shared types (GpsPosition, GpsFix)
packages/ui/                  → ThemeProvider, ErrorBanner, LoadingSpinner, ConfirmDialog, etc.

apps/hermes-shell/            → Next.js 16, port 4000
  /login                       → Login form
  /api/auth/{login,me,refresh} → Auth proxy routes

apps/hermes-gps-final/        → Next.js 16, port 4001
  /                            → Full-screen map + coordinate overlay
  /api/gps                     → GPS position proxy

apps/hermes-chat-final/       → Next.js 16, port 4002
  /                            → Auth-aware placeholder (Phase 3 target)