# Continuation Prompt — Phase 1

**Last session**: 2026-08-11  
**Branch**: `feature/1.1.0-sbitx-design-tokens`  
**Base branch**: `docs/hf-digital-specialist-review-fixes`  
**Commits**: 4 (see `docs/phase-1-progress.md` for full task-to-commit mapping)

---

## What Was Done

Phase 1 of `docs/development-plan.md` is fully implemented — 17 tasks across 4 commits:

1. **Scaffold** (`82b40d0`): sBitx design tokens, packages/shared-auth, 3 Next.js 16 apps
2. **Auth core** (`06d5bec`): TokenStore, AuthProvider, useAuthGuard, API routes, login page, app selector, testing infra
3. **Infrastructure** (`fcc419e`): PWA, CSP, deployment scripts, IndexedDB test, README
4. **Review fixes** (`fcdeaca`): ESLint configs, next-intl plugin, i18n request configs, Link components, vitest.config.ts, env.d.ts, SW registration, ThemeProvider key align

---

## What's Broken (Critical)

🔴 **CR-1: Provider hierarchy missing from all three root layouts**

The login page and app selector call `useAuth()` and `useAuthGuard()`. These hooks throw if not inside `<AuthProvider>`. The root layouts wrap children only with `<NextIntlClientProvider>` — not with the full provider stack from ADR-006:

```tsx
// apps/hermes-shell/src/app/layout.tsx (current — broken)
<body>
  <NextIntlClientProvider messages={messages}>
    {children}
  </NextIntlClientProvider>
</body>

// Expected (ADR-006):
<body>
  <NextIntlClientProvider messages={messages}>
    <AuthProvider>
      <ThemeProvider>
        <LocaleProvider>
          {children}
        </LocaleProvider>
      </ThemeProvider>
    </AuthProvider>
  </NextIntlClientProvider>
</body>
```

**Fix**: Edit all three `src/app/layout.tsx` files (shell, gps-final, chat-final) to add the provider stack. Also import:
```typescript
import { AuthProvider, LocaleProvider } from '@hermes/shared-auth';
import { ThemeProvider } from '@hermes/ui';
```

---

## Phase 1 Quality Gates (Remaining)

From `docs/development-plan.md` line 471. None have been verified yet:

- [ ] `npm run build` — zero TS errors
- [ ] `npm run lint` — zero warnings
- [ ] `npm test` — coverage targets
- [ ] ARM64 build on Raspberry Pi or QEMU
- [ ] Login E2E flow
- [ ] Cookie auth E2E
- [ ] Cross-app auth (token shared between apps)
- [ ] Theme toggle persistence
- [ ] Locale toggle en↔pt persistence
- [ ] CSP no violations
- [ ] IndexedDB persistence verified

---

## What to Do Next

1. **Fix CR-1**: Add provider hierarchy to all three layouts (see section above)
2. **Commit**: `fix(shell,gps,chat): add provider hierarchy to root layouts`
3. **Verify**: `npm run typecheck`, `npm run lint`, `npm test`
4. **Open PR**: `feature/1.1.0-sbitx-design-tokens` → `docs/hf-digital-specialist-review-fixes` (or rebase onto `main`)
5. **Merge → tag `v0.1.0`** if quality gates pass

---

## Helpful Files

| File | Purpose |
|---|---|
| `docs/phase-1-progress.md` | Task-by-task status with commit hashes |
| `docs/development-plan.md` | Full roadmap (Phase 1–3) |
| `docs/governance/engineering-standards.md` | Code conventions, commit format, PR template |
| `docs/architecture/frontend-overview.md` | System context |
| `docs/tasks/phase-1-shell-foundation-login.md` | Detailed task specs |
| `docs/tasks/phase-2-gps.md` | Next phase (12 tasks) |

---

## Architecture Snapshot

```
packages/tailwind-config/  → sBitx design tokens (44px touch, 18px body, breakpoints)
packages/shared-auth/      → Auth + WebSocket + Locale providers
packages/api/              → Dual-mode API client
packages/ui/               → ThemeProvider, ErrorBanner, etc.

apps/hermes-shell/         → Port 4000 — Login + App selector
apps/hermes-gps-final/     → Port 4001 — Auth-aware placeholder (Phase 2 target)
apps/hermes-chat-final/    → Port 4002 — Auth-aware placeholder (Phase 3 target)