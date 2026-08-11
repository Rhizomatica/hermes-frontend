# Continuation Prompt — HERMES Frontend

**Last session**: 2026-08-11
**Current branch**: `feature/1.1.0-sbitx-design-tokens`
**Base branch**: `docs/hf-digital-specialist-review-fixes`
**Commits**: 5 (see `docs/phase-1-progress.md` for full mapping)

---

## Overall Status

| Phase | Status | Tasks Complete | Tasks Total |
|---|---|---|---|
| Phase 1 — Shell, Foundation & Login | ✅ Implemented | 17 / 17 | 17 |
| Phase 2 — GPS Application | 📋 Planned | 0 / 12 | 12 |
| Phase 3 — Chat Application | 📋 Planned | 0 / 17 | 17 |

---

## Phase 1 — Shell, Foundation & Login

### What Was Done

1. **Scaffold** (`82b40d0`): sBitx design tokens, packages/shared-auth, 3 Next.js 16 apps
2. **Auth core** (`06d5bec`): TokenStore, AuthProvider, useAuthGuard, API routes, login page, app selector, testing infra
3. **Infrastructure** (`fcc419e`): PWA, CSP, deployment scripts, IndexedDB test, README
4. **Review fixes** (`fcdeaca`): ESLint configs, next-intl plugin, i18n request configs, Link components, vitest.config.ts, env.d.ts, SW registration, ThemeProvider key align

### What's Broken

🔴 **CR-1: Provider hierarchy missing from all three root layouts**

The login page and app selector call `useAuth()` and `useAuthGuard()`. These hooks throw if not inside `<AuthProvider>`. All three root layouts wrap children only with `<NextIntlClientProvider>` — not with the full provider stack from ADR-006.

**Fix**: Add to all three `src/app/layout.tsx`:
```typescript
import { AuthProvider, LocaleProvider } from '@hermes/shared-auth';
import { ThemeProvider } from '@hermes/ui';

// Inside <body>:
<NextIntlClientProvider messages={messages}>
  <AuthProvider>
    <ThemeProvider>
      <LocaleProvider>
        {children}
      </LocaleProvider>
    </ThemeProvider>
  </AuthProvider>
</NextIntlClientProvider>
```

### Remaining Quality Gates

See `docs/development-plan.md` line 471. None have been verified:

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

### Next Steps (Phase 1)

1. **Fix CR-1**: Add provider hierarchy to all three layouts
2. **Commit**: `fix(shell,gps,chat): add provider hierarchy to root layouts`
3. **Verify**: `npm run typecheck`, `npm run lint`, `npm test`
4. **Open PR**: `feature/1.1.0-sbitx-design-tokens` → target branch
5. **Merge → tag `v0.1.0`** if quality gates pass

---

## Phase 2 — GPS Application

### Prerequisites
- Phase 1 complete (all quality gates passing)
- Provider hierarchy fixed in layouts (CR-1)
- WebSocketProvider already implemented in shared-auth (Phase 1)

### Tasks

See `docs/tasks/phase-2-gps.md` for detailed specs (12 tasks).

**Week 3** — Map Foundation & Real-Time GPS:
1. 2.1.1: `WebSocketProvider` in shared-auth (already done in Phase 1)
2. 2.1.2: Add `WebSocketProvider` to all three layouts
3. 2.1.3: `useGpsCoords` hook
4. 2.1.4: API route proxy `GET /api/gps`
5. 2.1.5: `MapView` component (offline PMTiles)
6. 2.1.6: GPS page — main view

**Week 4** — GPS Features:
7. 2.2.1: GPS breadcrumb trail
8. 2.2.2: GPS status indicators
9. 2.2.3: Offline GPS cache
10. 2.2.4: Coordinate copy functionality

**Week 5** — Tile Management:
11. 2.3.1: Tile download script
12. 2.3.2: Map marker customization

### Starting Phase 2

```bash
# 1. Create a new feature branch from main (after Phase 1 is merged)
git checkout main
git pull
git checkout -b feature/2.1.1-websocket-provider

# 2. Or continue on the Phase 1 feature branch if it hasn't been merged yet
git checkout feature/1.1.0-sbitx-design-tokens
git checkout -b feature/phase-2-gps

# 3. Pick the first task and start coding
#    See docs/tasks/phase-2-gps.md for task specs
#    Follow docs/governance/engineering-standards.md for code patterns

# 4. Commit following conventional commits:
#    feat(gps): add useGpsCoords hook — task 2.1.3

# 5. Push + open PR when ready
```

---

## Phase 3 — Chat Application

### Prerequisites
- Phase 1 + Phase 2 complete
- WebSocketProvider, auth, GPS infrastructure working

### Tasks

See `docs/tasks/phase-3-chat.md` for detailed specs (17 tasks).

**Week 6** — Chat Core:
1. 3.1.1: Source-of-truth types in `@hermes/api`
2. 3.1.2: Message normalization utilities
3. 3.1.3: API route proxy `GET /api/messages`
4. 3.1.4: `useChatData` hook
5. 3.1.5: `buildConversations` + `filterConversation`
6. 3.1.6: Conversation list page

**Week 7** — Chat UI:
7-12. 3.2.1–3.2.6: Chat screen, MessageList, MessageBubble, MessageInput, AttachmentPreview, ChatHeader

**Week 8** — Offline & Messaging:
13-17. 3.3.1–3.3.5: Offline queue, send message, real-time sync, file upload, encrypted flow

**Week 9** — Radio Info & Polish:
18-22. 3.4.1–3.4.5: Radio dashboard, station discovery, ConversationItem, i18n, E2E tests

### Starting Phase 3

```bash
# 1. Create a new feature branch from main (after Phase 2 is merged)
git checkout main
git pull
git checkout -b feature/3.1.1-shared-types

# 2. Pick the first task and start coding
#    See docs/tasks/phase-3-chat.md for task specs

# 3. Commit following conventional commits:
#    feat(chat): add shared message types — task 3.1.1
```

---

## General Workflow (All Phases)

From `docs/development-plan.md` §2:

```
1. Pick task from docs/tasks/phase-N-*.md
2. Create feature branch: git checkout -b feature/task-description
3. Write code following:
   • docs/governance/engineering-standards.md (code patterns)
   • docs/adr/ADR-00N-*.md (architecture decisions)
   • docs/architecture/frontend-overview.md (system context)
4. Write tests (coverage targets in engineering-standards.md §7.2)
5. git push → open PR (template auto-fills)
6. CI runs: lint, typecheck, unit tests, build, E2E, bundle size
7. Self-review against PR checklist
8. Request review (1 for app code, 2 for shared packages)
9. Approve → Squash merge → Auto-deploy to staging sBitx
10. Phase complete? → git tag vX.Y.Z → Auto-deploy to production
```

---

## Helpful Files

| File | Purpose |
|---|---|
| `docs/phase-1-progress.md` | Phase 1 task-by-task status, commit mapping, known issues |
| `docs/development-plan.md` | Full roadmap (Phase 1–3), quality gates, workflow |
| `docs/governance/engineering-standards.md` | Code conventions, commit format, PR template, testing |
| `docs/architecture/frontend-overview.md` | System context, component tree, data flow |
| `docs/tasks/phase-1-shell-foundation-login.md` | Phase 1 detailed task specs |
| `docs/tasks/phase-2-gps.md` | Phase 2 detailed task specs |
| `docs/tasks/phase-3-chat.md` | Phase 3 detailed task specs |
| `docs/adr/` | Architecture decision records (001–009) |