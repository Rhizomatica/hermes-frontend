# HERMES Frontend — Development Plan

**Project**: hermes-fronted
**Last Updated**: 2026-08-06
**Status**: Planning complete. Ready for Phase 1 development.

---

## 1. Development Roadmap

| Phase | Duration | Deliverable | Tasks | Status |
|---|---|---|---|---|
| **Phase 1**: Shell, Foundation & Login | Weeks 1–2 | Login working. 3 apps scaffolded. Auth shared. Design system configured for sBitx. CI/CD pipeline active. | 17 tasks | ⏳ Ready |
| **Phase 2**: GPS Application | Weeks 3–5 | Offline map. Real-time GPS tracking via radio-daemon WS. Breadcrumb trail. Tile download. | 12 tasks | 📋 Planned |
| **Phase 3**: Chat Application | Weeks 6–9 | Full messaging. Offline queue. File uploads. Encrypted messages. Radio info dashboard. | 17 tasks | 📋 Planned |
| **Total** | **9 weeks** | Both apps production-ready on sBitx | **46 tasks** | |

---

## 2. Development Workflow (Fully Automated)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Development Flow                                 │
│                                                                          │
│  1. Pick task from docs/tasks/phase-N-*.md                               │
│       │                                                                  │
│  2. Create feature branch: git checkout -b feature/task-description      │
│       │                                                                  │
│  3. Write code following:                                                │
│       • docs/governance/engineering-standards.md (code patterns)         │
│       • docs/adr/ADR-00N-*.md (architecture decisions)                   │
│       • docs/architecture/frontend-overview.md (system context)          │
│       │                                                                  │
│  4. Write tests (coverage targets in engineering-standards.md §7.2)      │
│       │                                                                  │
│  5. git push → open PR (template auto-fills)                             │
│       │                                                                  │
│  6. CI runs automatically:                                               │
│       ├── ✅ Lint (ESLint strict)                                        │
│       ├── ✅ TypeScript (tsc --noEmit)                                   │
│       ├── ✅ Unit Tests (Vitest + coverage)                              │
│       ├── ✅ Build (Turborepo — all 3 apps)                              │
│       ├── ✅ E2E Tests (Playwright against built artifact)               │
│       └── ⚠️  Bundle Size (warns if >150MB)                              │
│       │                                                                  │
│  7. Self-review against PR checklist                                     │
│       │                                                                  │
│  8. Request review (1 reviewer for app code, 2 for shared packages)      │
│       │                                                                  │
│  9. Approve → Squash merge → Auto-deploy to staging sBitx               │
│       │                                                                  │
│  10. Phase complete? → git tag v1.0.0 → Auto-deploy to production sBitx │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Your Only Manual Steps
1. **Write code** (Steps 1–4)
2. **Check CI pass/fail** (Step 6)
3. **Submit PR + self-review** (Steps 5, 7)
4. **Approve merge** (Step 9)
5. **Tag release for prod** (Step 10)

Everything else — lint, typecheck, test, build, E2E, bundle check, deploy, rollback — is automated.

---

## 3. Branch Strategy

```
main
  │
  ├── feature/★           ← New features (from Phase task lists)
  ├── fix/★               ← Bug fixes
  ├── a11y/★              ← Accessibility improvements
  ├── perf/★              ← Performance improvements
  ├── refactor/★          ← Code refactoring
  ├── docs/★              ← Documentation changes
  └── chore/★             ← CI, dependencies, tooling
```

- **PR to `main`** → squash merge → auto-deploy to staging
- **Tag `v*` on `main`** → auto-deploy to production
- **Protected branch**: `main` requires passing CI + 1–2 approving reviews

---

## 4. Task List Summary

### Phase 1 Tasks (17 tasks)

| ID | Task | Category |
|---|---|---|
| 1.1.0 | sBitx viewport + design tokens | Infrastructure |
| 1.1.1 | `packages/shared-auth` scaffold | Package |
| 1.1.2 | `apps/hermes-shell` scaffold | App |
| 1.1.3 | `apps/hermes-gps-final` scaffold | App |
| 1.1.4 | `apps/hermes-chat-final` scaffold | App |
| 1.1.5 | PoC exclusion from Turborepo | Infrastructure |
| 1.2.1 | `TokenStore` abstraction | Auth |
| 1.2.2 | `AuthProvider` + `useAuth` | Auth |
| 1.2.3 | `useAuthGuard` hook | Auth |
| 1.2.4 | API route proxy (login/me/refresh) | Auth |
| 1.2.5 | Login page in shell | UI |
| 1.2.6 | App selector page in shell | UI |
| 1.2.7 | Auth-aware layouts (GPS + Chat) | Auth |
| 1.2.8 | PWA setup (SW + manifest) | Infrastructure |
| 1.2.9 | Public API boundaries + test infra + `createServerStateHook` | Package |
| 1.2.10 | CSP configuration | Security |
| 1.2.11 | Deployment pipeline + ARM64 cross-compilation | DevOps |
| 1.2.12 | IndexedDB persistence verification | Testing |
| 1.2.13 | README developer onboarding guide | Documentation |

### Phase 2 Tasks (12 tasks)

| ID | Task |
|---|---|
| 2.1.1 | `WebSocketProvider` in `@hermes/shared-auth` |
| 2.1.2 | Add `WebSocketProvider` to all layouts |
| 2.1.3 | `useGpsCoords` hook |
| 2.1.4 | API route proxy `GET /api/gps` |
| 2.1.5 | `MapView` component (offline PMTiles) |
| 2.1.6 | GPS page — main view |
| 2.2.1 | GPS breadcrumb trail |
| 2.2.2 | GPS status indicators |
| 2.2.3 | Offline GPS cache |
| 2.2.4 | Coordinate copy functionality |
| 2.3.1 | Tile download script |
| 2.3.2 | Map marker customization |

### Phase 3 Tasks (17 tasks)

| ID | Task |
|---|---|
| 3.1.1 | Source-of-truth types in `@hermes/api` |
| 3.1.2 | Message normalization utilities |
| 3.1.3 | API route proxy `GET /api/messages` |
| 3.1.4 | `useChatData` hook |
| 3.1.5 | `buildConversations` + `filterConversation` |
| 3.1.6 | Conversation list page |
| 3.2.1 | Chat screen page |
| 3.2.2 | `MessageList` component |
| 3.2.3 | `MessageBubble` component |
| 3.2.4 | `MessageInput` component |
| 3.2.5 | `AttachmentPreview` component |
| 3.2.6 | `ChatHeader` component |
| 3.3.1 | `useOfflineQueue` hook |
| 3.3.2 | `useSendMessage` hook |
| 3.3.3 | Message delivery real-time sync |
| 3.3.4 | File upload pipeline |
| 3.3.5 | Encrypted message flow |
| 3.4.1 | Radio info dashboard |
| 3.4.2 | Station discovery / new chat |
| 3.4.3 | `ConversationItem` component |
| 3.4.4 | Chat-specific i18n |
| 3.4.5 | Chat E2E tests |

---

## 5. Key Architecture Decisions

| ADR | Decision |
|---|---|
| ADR-001 | Dual-mode API client: `@hermes/api/server` for SSR, `@hermes/api/client` for browser |
| ADR-002 | Shared `WebSocketProvider` connecting to `hermes-radio-daemon` on `localhost:8081` |
| ADR-003 | HttpOnly cookie auth (prod) + localStorage (dev), single-flight token refresh |
| ADR-004 | IndexedDB offline message queue with UUID idempotency |
| ADR-005 | PMTiles + MapLibre GL JS for fully offline maps |
| ADR-006 | React Context + custom hooks (no state library) |
| ADR-007 | nginx reverse proxy: `/` → shell, `/gps` → GPS, `/chat` → chat |
| ADR-008 | sBitx canonical target: Raspberry Pi ARM64, 7-inch 800×480 touchscreen, air-gapped |
| ADR-009 | PWA for companion devices (replaces Capacitor) |

---

## 6. How to Start

```bash
# 1. Clone and install
git clone https://github.com/Rhizomatica/hermes-fronted.git
cd hermes-fronted
npm install

# 2. Start backend dependencies (dev only — Docker)
docker compose up -d

# 3. Pick a task from Phase 1
#    See docs/tasks/phase-1-shell-foundation-login.md

# 4. Create feature branch
git checkout -b feature/1.1.0-sbitx-design-tokens

# 5. Write code following:
#    docs/governance/engineering-standards.md

# 6. Push + open PR
git push -u origin HEAD
gh pr create --fill

# 7. CI runs automatically
# 8. Request review when CI is green
# 9. Merge → auto-deploy to staging
```

---

## 7. References

- [Project Brief](./project-brief.md) — Executive summary
- [Engineering Standards](./governance/engineering-standards.md) — Code patterns, commits, PRs, testing
- [Architecture Overview](./architecture/frontend-overview.md) — System context, component tree, data flow
- [Authentication Flow](./architecture/auth-flow.md) — Login, token refresh, cross-app auth
- [Phase 1 Tasks](./tasks/phase-1-shell-foundation-login.md)
- [Phase 2 Tasks](./tasks/phase-2-gps.md)
- [Phase 3 Tasks](./tasks/phase-3-chat.md)
- [HF Digital Specialist Audit](./audit/2026-08-06-hf-digital-specialist-review.md)
- [Senior Reviewer Audit](./audit/2026-08-06-senior-reviewer-assessment.md)