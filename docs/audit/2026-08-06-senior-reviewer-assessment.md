# Senior Software Project Reviewer — Comprehensive Assessment

**Project**: hermes-fronted  
**Reviewed by**: Senior Software Architect & Technical Reviewer  
**Date**: 2026-08-06  
**Documents Reviewed**: All ADRs (001–009), all task lists (Phase 1–3), architecture overview, auth flow, HF Digital Specialist audit  
**Scope**: Architecture, code quality, frontend, backend integration, security, performance, testing, DevOps, documentation, UX

---

## Executive Summary

The Hermes frontend plan is **well-structured and technically sound**. The architecture correctly places the HF transport boundary at the backend level, uses a shared monorepo with independently deployable apps, and makes pragmatic technology choices (Next.js, Tailwind, PWA over Capacitor). The documentation is thorough — 9 ADRs, 3 task lists, 2 architecture docs, and 2 audit reports.

**However**, there are several gaps that would cause problems during development and deployment. The most significant are: missing shared package architecture details, insufficient testing strategy, incomplete DevOps pipeline, and several UX patterns inherited from the PoC that should be explicitly rejected rather than carried forward.

**Overall Assessment**: ⚠️ **Approve with modifications** — the plan is solid, but 7 critical/high findings must be addressed before Phase 1 development begins.

---

## 1. Strengths

### Architecture
✅ **Correct HF transport boundary**: The frontend communicates only with local services (REST to `hermes-backend`, WebSocket to `hermes-radio-daemon`). HF transmission is handled by the backend. This is the right separation of concerns.

✅ **Independent deployability**: The three-app structure (shell, GPS, chat) with shared packages is well-designed. Stations can deploy only what they need. Path-based reverse proxy routing (ADR-007) is a clean, battle-tested pattern.

✅ **Technology choices are pragmatic**: Next.js 16 + React 19 + Tailwind + TypeScript strict mode is a modern, well-supported stack. Rejecting Capacitor for PWA (ADR-009) eliminates unnecessary complexity.

### Documentation
✅ **9 ADRs with clear structure**: Each ADR has Context → Decision → Consequences → Alternatives. This follows industry best practices (inspired by the ADR format from ThoughtWorks).

✅ **Task lists are actionable**: Each task has description, acceptance criteria with checkboxes, files to create/edit, stack notes, and doc references. A developer could pick up any task and implement it without asking clarifying questions.

✅ **Cross-referencing is consistent**: Documents reference each other appropriately (e.g., ADR-002 → ADR-006, task lists → ADRs).

### Security
✅ **HttpOnly cookie auth (ADR-003)**: Primary auth mechanism in production is HttpOnly cookies — XSS cannot steal tokens. The localStorage fallback for dev is explicitly dev-only with CSP mitigations.

✅ **Input validation in API routes**: Phase 1 tasks require input validation before proxying to backend (Task 1.2.4).

### Resilience
✅ **Offline-first message queue (ADR-004)**: IndexedDB-backed queue with UUID idempotency. Messages persist across page reloads and sBitx restarts.

✅ **Store-and-forward alignment**: The architecture correctly models the HF reality — messages are queued, not sent in real-time.

---

## 2. Weaknesses

### Architecture

🟠 **High — No clear package API boundaries defined for `@hermes/shared-auth`**

The plan describes what `@hermes/shared-auth` will contain (AuthProvider, WebSocketProvider, LocaleProvider, tokenStore, useAuthGuard), but doesn't define the public API surface. Without this, developers will export internal utilities that shouldn't be public, creating coupling between apps and package internals.

**Recommendation**: Add a task or section defining the public API of `@hermes/shared-auth`:
```typescript
// @hermes/shared-auth public API (barrel export)
export { AuthProvider, useAuth, useAuthGuard } from './auth';
export { WebSocketProvider, useWebSocket } from './websocket';
export { LocaleProvider, useLocale } from './locale';
// NOT exported: tokenStore internals, wsEvents raw types
```

🟡 **Medium — No shared hook factory pattern documented**

ADR-006 describes a `ServerState<T>` interface and module-level caching, but doesn't specify a hook factory that enforces this. Without it, each developer implements caching/dedup differently, leading to inconsistencies.

**Recommendation**: Add a `createServerStateHook` factory to `@hermes/shared-auth`:
```typescript
function createServerStateHook<T>(
  cacheKey: string,
  fetcher: () => Promise<T>
): () => ServerState<T>;
```

### Frontend

🟠 **High — PoC patterns should be explicitly listed as "do not carry forward"**

Several PoC patterns are deficient (e.g., `any` types in `useScrollPager`, raw `fetch` in login page, inline error handling inconsistency). The plan mentions these as shortcomings but doesn't add tasks to prevent their recurrence in the final codebase.

**Recommendation**: Add an explicit "Anti-Patterns: Do Not Carry Forward" section in each task list's quality gates, referencing specific PoC patterns.

🟡 **Medium — No component contract standard defined**

The Frontend Architect agent calls for "clear component contracts via TypeScript interfaces". The plan mentions this in principle but no ADR or task specifies the contract format. Without this, components will have inconsistent prop patterns.

**Recommendation**: Define a component contract standard:
```typescript
// Every component exports these:
export interface MyComponentProps { /* ... */ }
export function MyComponent(props: MyComponentProps): JSX.Element;
// Plus JSDoc with @example
```

🟡 **Medium — Accessibility audit deferred to Phase 5 (post-implementation)**

The plan audits accessibility at the end (Phase 5), which means inaccessible components will be built and then retrofitted. Accessibility should be integrated into each phase's quality gates.

**Recommendation**: Add a11y acceptance criteria to every component task (ARIA labels, keyboard navigation, focus management, screen reader testing). Move a11y audit from Phase 5 to each phase's completion criteria.

### DevOps

🔴 **Critical — No CI/CD pipeline defined**

Phase 1 Task 1.2.9 mentions "CI/CD foundation" with lint/typecheck/test. This is insufficient — it's a CI check, not a CD pipeline. There's no plan for:
- How builds are produced (standalone output)
- How builds are versioned
- How builds are tested on ARM64
- How builds are deployed to the sBitx
- Rollback strategy

**Recommendation**: Add a dedicated ADR or Phase 1 task for the deployment pipeline:
1. Build: `npm run build` per app → Next.js standalone output
2. Version: git tag + semver → embedded in build metadata
3. Test: Playwright E2E on built artifacts (not dev server)
4. Package: tar.gz of standalone output for sBitx deployment
5. Deploy: scp to sBitx → systemd restart
6. Rollback: systemd retains previous version

🟠 **High — No ARM64 cross-compilation plan**

The sBitx runs on ARM64. Next.js standalone output is architecture-specific. Building on an x86_64 dev machine produces x86_64 binaries — they won't run on the Raspberry Pi.

**Recommendation**: Add a task for ARM64 cross-compilation setup:
- Use `docker buildx` with `--platform linux/arm64` for producing ARM64 standalone output
- OR use QEMU user-mode emulation in CI
- OR cross-compile natively with `--target_arch=arm64` if Node.js supports it
- Test the output on an actual Raspberry Pi before field deployment

### Testing

🔴 **Critical — No unit test coverage targets for each phase**

The plan mentions ">80% coverage on new modules" in Phase Quality Gates, but doesn't define which modules, what kind of tests, or how coverage is measured. Without specific targets, tests will be written inconsistently.

**Recommendation**: Add specific test targets per phase:
- Phase 1: `@hermes/shared-auth` tokenStore, AuthProvider, useAuth — 100% unit test coverage
- Phase 2: `useGpsCoords`, `mapStyle`, `buildConversations` — 100% unit test coverage
- Phase 3: `useChatData`, `useSendMessage`, `useOfflineQueue`, `useScrollPager` — 100% unit test coverage
- All hooks must have integration tests with mocked API/WS
- All shared components in `@hermes/ui` must have render tests (Vitest + React Testing Library)
- E2E tests for critical flows (login, send message, view GPS)

🟡 **Medium — No test fixture/mock strategy**

When testing hooks that depend on `@hermes/api`, `WebSocketProvider`, and `AuthProvider`, developers need consistent mocks. Without a shared mock strategy, each test file reinvents the wheel.

**Recommendation**: Create a `packages/shared-auth/src/testing/` directory with:
- Mock `AuthProvider` for component tests
- Mock `WebSocketProvider` that emits configurable events
- Mock `hermesGet`/`hermesPost` factories
- Test fixture data (sample messages, conversations, GPS positions)

### Documentation

🟡 **Medium — No developer onboarding guide**

The plan has extensive architecture documentation but no "Getting Started" guide for developers joining the project. The existing README covers the PoC — it needs updating for the final architecture.

**Recommendation**: Add a Phase 1 task to rewrite README.md with:
- Architecture overview diagram
- Development setup (npm install, env vars, docker compose up)
- Running individual apps (npm run dev:shell, :gps, :chat)
- Running tests
- Project conventions (component patterns, hook patterns, i18n, a11y)

---

## 3. Risks

### Architecture Risks

🔴 **Critical — `@hermes/api` dual-mode transport complexity**

ADR-001 specifies a dual-mode API client (Node.js `https` for SSR, browser `fetch` for client). This is the right design, but the implementation is tricky:
- The transport detection (`typeof window === 'undefined'`) works at module load time, not runtime. If the module is imported in a file that runs in both environments (e.g., a shared component imported by both a page and a route handler), the wrong transport may be selected.
- The `hermesGetBuffer` function returns `Buffer` — this is Node.js-only. If called from client code, it will crash.

**Risk**: Runtime errors in edge cases (SSR + hydration, shared code between server and client).

**Mitigation**: Add an explicit environment parameter to the API client instead of relying on module-level detection:
```typescript
function createHermesClient(environment: 'server' | 'client') {
  const transport = environment === 'server' ? nodeTransport : browserTransport;
  // ...
}
```
Route handlers pass `'server'`. Client components pass `'client'`. No ambiguity.

🔴 **Critical — Token refresh race condition**

ADR-003 describes a token refresh interceptor: on 401 → POST /auth/refresh → retry original request. If multiple requests fail simultaneously (e.g., page load triggers 3 API calls, all get 401), multiple refresh calls will fire concurrently.

**Risk**: Multiple concurrent refresh calls → backend may invalidate the refresh token after the first call → subsequent calls fail → user is logged out unnecessarily.

**Mitigation**: Add a refresh token mutex (single-flight pattern):
```typescript
let refreshPromise: Promise<boolean> | null = null;
async function refreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
  return refreshPromise;
}
```
Multiple concurrent 401s share the same refresh promise.

🟠 **High — IndexedDB quota on sBitx microSD**

ADR-004 stores offline messages in IndexedDB. Chromium on the Raspberry Pi may have limited or no persistent storage quota (IndexedDB may be cleared on browser restart in kiosk mode).

**Risk**: Messages queued for offline delivery may be lost if the browser clears storage.

**Mitigation**: Add a Phase 1 task to verify IndexedDB persistence on Chromium kiosk mode. If unreliable, fall back to a file-based queue (writing to a known path on the filesystem, served by a backend API).

### Performance Risks

🟠 **High — Next.js SSR may be unnecessary on sBitx**

The sBitx runs Chromium in kiosk mode — a client-side rendering environment. Next.js SSR adds server-side rendering overhead (Node.js process memory, render time) that provides no benefit on a single-user, local-only kiosk.

**Risk**: Wasted memory and CPU on the Raspberry Pi for SSR that nobody benefits from (the sBitx user is the only user, and they're using Chromium, which does client-side rendering).

**Mitigation**: Configure Next.js for client-side rendering only (SPA mode) on the sBitx build:
```typescript
// next.config.ts for sBitx build
export default {
  output: 'export', // static export — no Node.js server needed for shell
  // or for dynamic apps:
  // experimental: { appDir: true },
  // No SSR — all rendering is client-side
};
```
If SSR is kept for route handlers (API proxies), ensure only the route handlers run server-side.

### Security Risks

🟡 **Medium — `localStorage` auth fallback in dev**

ADR-003 uses localStorage as a dev fallback for cross-port auth. While this is labeled "dev-only", developers may forget to test the cookie path.

**Risk**: Devs test exclusively with localStorage. Production cookie path has bugs that go undetected.

**Mitigation**: Add an E2E test that explicitly tests the cookie auth path (using Playwright with `storageState` and cookie manipulation).

🟡 **Medium — No Content Security Policy defined**

The plan mentions CSP in ADR-003 ("CSP headers with `script-src 'self'`") but doesn't specify where CSP is configured or what the full CSP header should be.

**Risk**: Without an explicit CSP, the project may ship without one, leaving XSS surface area unprotected.

**Recommendation**: Add a Phase 1 task to configure CSP headers in `next.config.ts`:
```typescript
// Content-Security-Policy header
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // Tailwind needs inline styles
  "img-src 'self' data: blob:",       // Map tiles, pasted images
  "connect-src 'self' ws://localhost:* http://localhost:*", // API + WS
  "font-src 'self'",
  "manifest-src 'self'",
].join('; ');
```

---

## 4. Recommendations

### Priority 1: Before Phase 1 Development (Must Fix)

| # | Finding | Severity | Action |
|---|---|---|---|
| 1 | No deployment pipeline (CI only, no CD) | 🔴 Critical | Add ADR or task for ARM64 build → version → test → package → deploy pipeline |
| 2 | No ARM64 cross-compilation plan | 🔴 Critical | Add task for `docker buildx --platform linux/arm64` or QEMU-based cross-compilation |
| 3 | No unit test coverage targets per phase | 🔴 Critical | Add specific coverage targets per module per phase |
| 4 | `@hermes/api` dual-mode transport ambiguity | 🔴 Critical | Add explicit environment parameter instead of module-level detection |
| 5 | Token refresh race condition | 🔴 Critical | Add single-flight pattern (mutex) for refresh token calls |
| 6 | No package API boundaries defined | 🟠 High | Define public API surface for each shared package |
| 7 | PoC anti-patterns not explicitly rejected | 🟠 High | Add "Anti-Patterns: Do Not Carry Forward" to each phase's quality gates |

### Priority 2: During Phase 1–2 Development

| # | Finding | Severity | Action |
|---|---|---|---|
| 8 | No component contract standard | 🟡 Medium | Define TypeScript interface pattern for all components |
| 9 | Accessibility deferred to Phase 5 | 🟡 Medium | Add a11y criteria to every component task |
| 10 | IndexedDB persistence unverified on sBitx | 🟠 High | Verify Chromium kiosk IndexedDB persistence in Phase 1 |
| 11 | SSR may be unnecessary on sBitx | 🟠 High | Evaluate SPA-only mode for sBitx build |
| 12 | No test fixture/mock strategy | 🟡 Medium | Create shared test utilities in `packages/shared-auth/src/testing/` |
| 13 | No developer onboarding guide | 🟡 Medium | Add README rewrite to Phase 1 |
| 14 | No CSP header defined | 🟡 Medium | Add CSP configuration to Phase 1 |
| 15 | No hook factory for ServerState pattern | 🟡 Medium | Add `createServerStateHook` to `@hermes/shared-auth` |

### Priority 3: Post-Phase 3 Improvements

| # | Finding | Severity | Action |
|---|---|---|---|
| 16 | No observability/monitoring on sBitx | 🟢 Low | Add healthcheck endpoints + simple metrics dashboard (Phase 3+) |
| 17 | No automated visual regression testing | 🟢 Low | Consider Percy or Chromatic for component visual testing |
| 18 | No bundle size monitoring in CI | 💡 Enhancement | Add `@next/bundle-analyzer` + size budget to CI pipeline |

---

## 5. Design Alternatives to Consider

### Alternative 1: Single Turborepo App with Build-Time Feature Flags

Instead of three separate Next.js apps (`hermes-shell`, `hermes-gps-final`, `hermes-chat-final`), consider a **single Next.js app** with route groups and build-time feature flags that produce separate builds:

```
apps/hermes-app/
  src/app/
    (shell)/        ← Always built
      login/
      page.tsx
    (gps)/          ← Built when GPS feature is enabled
      page.tsx
    (chat)/         ← Built when Chat feature is enabled
      page.tsx
```

Build commands:
```bash
APP_FEATURES=shell,gps npm run build   # GPS-only station
APP_FEATURES=shell,gps,chat npm run build  # Full station
```

**Trade-offs**:
- ✅ Single codebase — no duplicate layouts, providers, fonts, i18n
- ✅ Feature flag approach naturally supports independent deployment
- ✅ TypeScript ensures cross-feature consistency
- ❌ Less explicit separation — developers may accidentally import GPS code from Chat
- ❌ Turborepo caching less effective (one large build vs three small)
- ❌ Requires more sophisticated build configuration

**Recommendation**: The current three-app approach is simpler and the overhead of shared providers (all apps wrap the same hierarchy) is acceptable. **Keep the three-app structure.** The static export for shell reduces the runtime burden of this approach.

### Alternative 2: JSON-RPC or Protobuf for WebSocket Events

Instead of plain JSON objects for WebSocket events (ADR-002), consider a schema-based protocol like JSON-RPC or Protobuf:

```typescript
// JSON-RPC style
{ "jsonrpc": "2.0", "method": "gps.position", "params": { "lat": ..., "lon": ... } }

// Protobuf (binary)
// message GpsPosition { double lat = 1; double lon = 2; ... }
```

**Trade-offs**:
- ✅ Schema validation at the protocol level
- ✅ Protobuf is more compact (important for HF bandwidth — but WebSocket is localhost, not HF)
- ❌ JSON is simpler to debug
- ❌ WebSocket is localhost only — bandwidth is not a concern

**Recommendation**: JSON is appropriate for localhost WebSocket communication. Keep the current approach. If WebSocket events are ever transmitted over HF (they shouldn't be — that's the backend's job), then consider a binary protocol.

---

## 6. Quality Gate Checklist

Before Phase 1 development begins, verify:

- [ ] ARM64 build pipeline is configured and produces running binaries on Raspberry Pi
- [ ] `@hermes/shared-auth` public API is documented (which exports are public, which are internal)
- [ ] PoC anti-patterns are documented as "do not carry forward"
- [ ] Test coverage targets are defined per module per phase
- [ ] Token refresh uses single-flight pattern
- [ ] `@hermes/api` uses explicit environment parameter
- [ ] CSP header is configured
- [ ] IndexedDB persistence is verified on Chromium kiosk mode
- [ ] Component contract standard is defined
- [ ] Accessibility criteria are added to every component task
- [ ] README includes developer onboarding guide
- [ ] Shared test fixtures/mocks are available in `packages/shared-auth/src/testing/`

---

**Reviewer**: Senior Software Architect & Technical Reviewer  
**Signature**: Reviewed with 7 critical/high findings requiring resolution before Phase 1