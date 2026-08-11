# HERMES Frontend — Automated Development Prompt

**Target**: AI agent executing frontend development tasks.
**Last session**: 2026-08-11
**Branch**: `feature/1.1.0-sbitx-design-tokens` (6 commits ahead of base)
**Base**: `docs/hf-digital-specialist-review-fixes`

---

## Agent Instructions (Read First)

### 1. Mandatory Reading Before Any Task

Read these files before writing a single line of code:

| Order | File | What to Extract |
|---|---|---|
| 1 | `docs/governance/engineering-standards.md` | Commit format (§1), branch naming (§2), PR template (§3), component pattern (§4.1), hook pattern (§4.2), API route pattern (§4.3), design token usage (§4.4), i18n usage (§4.5), a11y (§4.6), directory structure (§5), naming (§5.3), TypeScript strict (§6), forbidden patterns (§6.2), test location/coverage/structure (§7), ESLint rules (§8), dependency rules (§9), anti-patterns to avoid (§11) |
| 2 | `docs/architecture/frontend-overview.md` | System context, component tree, data flow |
| 3 | `docs/adr/ADR-006-state-management.md` | Provider hierarchy order for layouts |
| 4 | `.commitlintrc.json` | Allowed commit types and scopes |

### 2. Code Patterns (Copy-Paste for Every Component/Hook/Route)

#### Component Pattern (from Engineering Standards §4.1)
- Imports: React/Next → external libs → @hermes/* → local
- Exported Props interface with JSDoc on every prop
- Component function with JSDoc @example
- Hooks at top in dependency order, then derived values, then event handlers
- Conditional rendering early returns (loading → LoadingSpinner, empty state, error → ErrorBanner)
- Main render with semantic HTML and aria-labels

#### Hook Pattern (from Engineering Standards §4.2) — MANDATORY for data-fetching hooks
- Must return `ServerState<T>`: `{ data, loading, error, refresh }`
- Module-level `Map<string, Promise<unknown>>` for in-flight request dedup
- `useState` + `useEffect` + `useCallback` pattern
- Keep previous data on refresh failure

#### API Route Pattern (from Engineering Standards §4.3)
- `hermesGet`/`hermesPost` from `@hermes/api` (not raw fetch)
- Validate input before forwarding to backend
- Return structured error responses with proper status codes
- Pass `cookie` from incoming request

### 3. Commit & Branch Rules
- **Branch naming**: `feature/<task-id>-<kebab-description>` (e.g., `feature/2.1.3-gps-coords-hook`)
- **Commit format**: `type(scope): description` per `.commitlintrc.json`
- **Allowed types**: feat, fix, perf, a11y, style, refactor, docs, test, chore, revert
- **Allowed scopes**: shell, gps, chat, api, ui, shared-auth, tailwind-config, config, utils, docs, ci, deps, repo
- **Commit after each task** — never batch multiple tasks into one commit
- **PR from task branch** into `feature/1.1.0-sbitx-design-tokens` (Phase 1 fixes) or `main` (Phase 2+)

### 4. Testing Requirements
| Module Type | Coverage Target |
|---|---|
| Pure utility functions (`lib/`) | 100% (all branches) |
| Hooks (`hooks/`) | 100% (loading, data, error, edge cases) |
| Shared components (`@hermes/ui`) | 100% |
| App components (`apps/*/components/`) | ≥80% |
| API route handlers | 100% |

### 5. i18n Requirements
- Every user-facing string MUST use `useTranslations('namespace')`
- Every key MUST exist in both `messages/en.json` and `messages/pt.json`
- Dates use `Intl.DateTimeFormat`, relative times use `Intl.RelativeTimeFormat`

### 6. Forbidden Patterns (from Engineering Standards §11)
- ❌ `any` types (use `unknown` or proper generics)
- ❌ Raw `fetch` in component render (always behind a hook)
- ❌ `localStorage` for auth in production paths (use HttpOnly cookies)
- ❌ Inline error `<p>` — always use `ErrorBanner` from `@hermes/ui`
- ❌ Google Fonts CDN — fonts must be self-hosted in `/public/fonts/`
- ❌ Capacitor dependencies in final apps
- ❌ `console.log` in production code (use `console.error` in API routes only)
- ❌ Hardcoded colors/spacing — all values from design tokens
- ❌ Non-null assertions (`!`) — use optional chaining + null coalescing

---

## Current State

| Phase | Status | Tasks Complete | Tasks Total |
|---|---|---|---|
| Phase 1 — Shell, Foundation & Login | ✅ Implemented | 17 / 17 | 17 |
| Phase 2 — GPS Application | 📋 Planned | 0 / 12 | 12 |
| Phase 3 — Chat Application | 📋 Planned | 0 / 17 | 17 |

---

## Phase 1 — Critical Fix (Do First)

### 🔴 CR-1: Add provider hierarchy to all three root layouts

**Why**: `useAuth()` and `useAuthGuard()` throw if not inside `<AuthProvider>`. Layouts currently wrap children only with `<NextIntlClientProvider>`. App will crash on load.

**Files**: `apps/hermes-shell/src/app/layout.tsx`, `apps/hermes-gps-final/src/app/layout.tsx`, `apps/hermes-chat-final/src/app/layout.tsx`

**Provider order** (ADR-006): `AuthProvider → ThemeProvider → LocaleProvider → NextIntlClientProvider`

**What to add**:
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

**Commit**: `fix(shell,gps,chat): add provider hierarchy to root layouts`

---

## Phase 1 — Quality Gates (Verify Before Moving to Phase 2)

```bash
npm run typecheck   # Must pass with zero errors
npm run lint        # Must pass with zero warnings
npm run test        # Must pass
npm run build       # Must succeed
```

Manual verification (requires backend running):
- [ ] Login at `http://localhost:4000/login` → redirected to app selector
- [ ] App selector shows GPS and Chat links
- [ ] `http://localhost:4001` (GPS) shows auth-aware page
- [ ] `http://localhost:4002` (Chat) shows auth-aware page
- [ ] Logout clears session
- [ ] Theme toggle persists across apps
- [ ] Locale toggle en↔pt persists

---

## Phase 2 — GPS Application (12 tasks)

### Prerequisites
- Phase 1 complete with CR-1 fixed. `npm run typecheck`/`lint`/`test`/`build` all pass.
- WebSocketProvider already implemented in `@hermes/shared-auth`

### Week 3: Map Foundation & Real-Time GPS

#### 2.1.1: WebSocketProvider — SKIP (Done in Phase 1)

#### 2.1.2: Add WebSocketProvider to layouts
**Files**: All three `src/app/layout.tsx`
**What**: Add `<WebSocketProvider>` as innermost wrapper (after LocaleProvider).
```typescript
import { WebSocketProvider } from '@hermes/shared-auth';
// Wrap children:
<WebSocketProvider>{children}</WebSocketProvider>
```
**Commit**: `feat(shell,gps,chat): add WebSocketProvider to layout provider hierarchy — task 2.1.2`

#### 2.1.3: useGpsCoords hook
**Files**: `apps/hermes-gps-final/src/hooks/useGpsCoords.ts` + `.test.ts`
**Pattern**: ServerState<T> (mandatory)
**What**: Subscribe to `gps.position` + `gps.fix` WS events. Fallback to `GET /api/gps` polling every 30s when WS disconnected. `stale` flag if last update >60s. `lastUpdated` Date. Cleanup on unmount.
**Test**: 100% coverage — WS update, REST fallback, error, stale, cleanup.
**Commit**: `feat(gps): add useGpsCoords hook — task 2.1.3`

#### 2.1.4: API route proxy GET /api/gps
**Files**: `apps/hermes-gps-final/src/app/api/gps/route.ts`, `packages/api/src/types.ts` (add GpsPosition)
**Pattern**: API Route Pattern
**GpsPosition**: `{ latitude, longitude, altitude, speed, heading, timestamp }`
**Commit**: `feat(gps,api): add GpsPosition type and GET /api/gps route — task 2.1.4`

#### 2.1.5: MapView component
**Files**: `apps/hermes-gps-final/src/components/MapView.tsx`, `apps/hermes-gps-final/src/lib/mapStyle.ts`
**Pattern**: Component Pattern. Dynamic import with `ssr: false`.
**What**: Maplibre GL + PMTiles. Light/dark styles. Pulsing station marker. Fly-to (1.5s). NavControl + ScaleControl. Tile error overlay (i18n). ResizeObserver.
**Commit**: `feat(gps): add MapView component with offline PMTiles — task 2.1.5`

#### 2.1.6: GPS main page
**Files**: `apps/hermes-gps-final/src/app/page.tsx` (overwrite), `apps/hermes-gps-final/src/components/CoordinatePanel.tsx`, messages/en.json, messages/pt.json
**What**: Full-screen MapView + bottom panel (coordinates decimal+DMS, timestamp, refresh button, theme/locale toggles). Error banner with retry. i18n.
**Commit**: `feat(gps): add GPS main page with coordinate panel — task 2.1.6`

### Week 4: GPS Advanced Features

#### 2.2.1: Breadcrumb trail
**Files**: `api/gps/history/route.ts`, `hooks/useGpsHistory.ts`, `components/BreadcrumbToggle.tsx`, edit MapView
**What**: GET /api/gps/history route. useGpsHistory hook (ServerState). Polyline with gradient (orange-500→200). Toggle. Click tooltip. Max 500 points.
**Commit**: `feat(gps): add GPS breadcrumb trail — task 2.2.1`

#### 2.2.2: GPS status indicators
**Files**: `components/GpsStatusBadge.tsx`, edit useGpsCoords, messages
**What**: Fix quality badge (No Fix=red, 2D=yellow, 3D=green), satellite count, HDOP with tooltip. Real-time via gps.fix WS.
**Commit**: `feat(gps): add GPS status indicators — task 2.2.2`

#### 2.2.3: Offline GPS cache
**Files**: `lib/gpsCache.ts`, edit useGpsCoords
**What**: localStorage cache. Load when WS+REST fail. "Last known" badge with age. Clear on logout.
**Commit**: `feat(gps): add offline GPS cache — task 2.2.3`

#### 2.2.4: Coordinate copy
**Files**: edit CoordinatePanel
**What**: Click coordinate → clipboard. "Copied!" toast 2s. aria-label.
**Commit**: `feat(gps): add coordinate copy to clipboard — task 2.2.4`

### Week 5: Tile Management & Polish

#### 2.3.1: Tile download script
**Files**: `scripts/download-tiles.sh`, edit package.json
**What**: Download brazil.pmtiles. SHA256 checksum. Progress bar. Skip if cached+checksum match. postinstall hook.
**Commit**: `feat(gps): add tile download script — task 2.3.1`

#### 2.3.2: Map marker customization
**Files**: `public/marker.svg`, edit MapView
**What**: Hermes SVG marker. Direction arrow (rotated by heading). Accuracy circle (HDOP proportional). CSS animations.
**Commit**: `feat(gps): add custom marker — task 2.3.2`

#### 2.3.3: GPS i18n — SKIP if 2.1.6 complete
#### 2.3.4: GPS E2E tests
**Files**: `e2e/gps.spec.ts`, `docs/testing/gps-manual-checklist.md`
**Commit**: `test(gps): add GPS E2E tests — task 2.3.4`

### Phase 2 Quality Gates
`npm run build` (zero TS errors), `npm test` (>80% GPS hooks). Map renders offline, WS updates, REST fallback, smooth marker, breadcrumb, dark/light, i18n, offline cache, copy.

---

## Phase 3 — Chat Application (17 tasks)

### Prerequisites: Phase 1 + Phase 2 complete.

### Week 6: Chat Core — Data Layer & Conversation List

#### 3.1.1: Shared types in @hermes/api
**Files**: `packages/api/src/types.ts`, edit index.ts
**Types**: Message, Conversation, Station, HermesUser
**Commit**: `feat(api): add shared types — task 3.1.1`

#### 3.1.2: Message normalization
**Files**: `packages/api/src/normalize.ts` + `.test.ts`, edit index.ts
**Functions**: destArray, stationId, canonicalize. 100% test coverage.
**Commit**: `feat(api): add normalization utilities — task 3.1.2`

#### 3.1.3: API route GET /api/messages
**Files**: `apps/hermes-chat-final/src/app/api/messages/route.ts`
**Pattern**: API Route Pattern. GET merges inbox+sent, deduplicates, sets inbox flag. POST/DELETE proxy.
**Commit**: `feat(chat): add merged messages API route — task 3.1.3`

#### 3.1.4: useChatData hook
**Files**: `hooks/useChatData.ts` + `.test.ts`
**Pattern**: ServerState<T>. Fetches messages, sentIds, syncedIds. WS subscriptions for message.new + message.delivered. Module-level cache + dedup. 100% coverage.
**Commit**: `feat(chat): add useChatData hook — task 3.1.4`

#### 3.1.5: Conversation utilities
**Files**: `packages/api/src/conversation.ts` + `.test.ts`
**Functions**: buildConversations, filterConversation. 100% coverage.
**Commit**: `feat(api): add conversation grouping — task 3.1.5`

#### 3.1.6: Conversation list page
**Files**: `apps/hermes-chat-final/src/app/page.tsx` (overwrite), `components/home/ConversationList.tsx`, messages
**Pattern**: Component Pattern. useAuthGuard + useChatData. Search (300ms debounce). Pull-to-refresh. Loading/empty/error states. FAB to /new-chat. Keyboard nav.
**Commit**: `feat(chat): add conversation list page — task 3.1.6`

### Week 7: Chat Screen — Messages & Input

#### 3.2.1: Chat screen page — `chat/[station]/page.tsx`
#### 3.2.2: MessageList — 4 files (list, scrollPager, dateDivider, newMsgCue). No `any` types.
#### 3.2.3: MessageBubble — 4 files (bubble, fileAttachment, deliveryStatus, deleteButton)
#### 3.2.4: MessageInput — file attachment, encryption toggle, ≤500KB validation, paste
#### 3.2.5: AttachmentPreview — thumbnail, remove, file size, password field
#### 3.2.6: ChatHeader — back, station name, last-heard from WS, refresh

### Week 8: Chat Advanced — Offline, Files, Real-Time

#### 3.3.1: useOfflineQueue — IndexedDB, auto-drain, UUID idempotency
#### 3.3.2: useSendMessage — optimistic insert, offline enqueue, file+encrypt pipeline
#### 3.3.3: Real-time delivery sync — WS subscriptions for hfStatus, synced, delivered
#### 3.3.4: File upload pipeline — upload with progress, XMLHttpRequest, ≤500KB
#### 3.3.5: Encrypted message flow — lock icon, PasswordDialog, decrypt on demand

### Week 9: Chat Polish — Radio Info, Discovery, E2E

#### 3.4.1: Radio info dashboard — SysInfo, CallerList, /sys and /caller API routes
#### 3.4.2: Station discovery — station list, search, filter conversations
#### 3.4.3: ConversationItem — avatar, preview, Intl.RelativeTimeFormat, unread badge
#### 3.4.4: Chat i18n — all namespaces in en.json + pt.json
#### 3.4.5: Chat E2E — 6 Playwright tests

### Phase 3 Quality Gates
`npm run build` (zero TS errors), `npm test` (>80% chat hooks). Full chat flow, offline queue, scroll pager, real-time, file upload, encryption, radio info, station discovery, keyboard nav, aria-labels.

---

## Stopping Point

When all three phases complete and quality gates pass:
```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## Helpful Files

| File | When to Read |
|---|---|
| `docs/phase-1-progress.md` | To understand what was already done in Phase 1 |
| `docs/governance/engineering-standards.md` | Before every task |
| `docs/architecture/frontend-overview.md` | Once at start |
| `docs/adr/ADR-006-state-management.md` | Before adding providers to layouts |
| `docs/adr/ADR-003-auth-strategy.md` | Before modifying auth code |
| `docs/adr/ADR-002-websocket-client.md` | Before WS-related tasks |
| `docs/adr/ADR-004-offline-queue.md` | Before offline queue tasks |
| `docs/adr/ADR-005-map-tiles.md` | Before map tasks |
| `docs/tasks/phase-2-gps.md` | Original detailed task specs for Phase 2 |
| `docs/tasks/phase-3-chat.md` | Original detailed task specs for Phase 3 |