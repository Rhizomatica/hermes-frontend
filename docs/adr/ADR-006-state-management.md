# ADR-006: State Management

**Status**: Accepted  
**Date**: 2026-08-06  
**Deciders**: Frontend Architect, Senior Project Manager

---

## Context

The Hermes frontend monorepo spans three apps with shared infrastructure. State must flow predictably across:
- **Server state**: Messages, conversations, GPS coordinates, station lists — fetched from `hermes-backend` REST API or `hermes-radio-daemon` WebSocket
- **Client state**: UI ephemerals — input values, modal open/close, scroll positions
- **Auth state**: User session, JWT tokens — security-critical, must never be stale
- **Connection state**: WebSocket connectivity, online/offline status
- **URL state**: Route parameters (station ID in chat, query strings)

The PoC uses `useState` + `useEffect` + `fetch` in custom hooks (`useChatData`, `useNodeInfo`, `useStationAlias`). This pattern is simple but has no caching, no deduplication, and no stale-while-revalidate. The Frontend Architect agent explicitly calls for state classification by type with appropriate tooling per bucket.

## Decision

**We will use React Context + custom hooks for state management. No external state library (Redux, Zustand, Jotai).**

Rationale: The app's state model is straightforward — server state is fetched and displayed, mutations are write-through. The complexity comes from connectivity (offline/online/WebSocket), not from deeply nested or cross-cutting client state. React Context + hooks are sufficient and avoid adding a dependency.

### State Classification & Tooling

| State Type | Mechanism | Tool |
|---|---|---|
| **Server State** | Custom hooks with manual invalidation | `useChatData`, `useGpsCoords`, `useStations` |
| **Client State** | Colocated `useState`/`useReducer` | React built-in |
| **Form State** | Local `useState` with controlled inputs | React built-in |
| **Auth State** | `AuthProvider` (React Context) | `@hermes/shared-auth` |
| **Theme State** | `ThemeProvider` (React Context + CSS custom properties) | `@hermes/ui` |
| **Locale State** | `LocaleProvider` (React Context + `next-intl`) | `@hermes/shared-auth` |
| **WebSocket State** | `WebSocketProvider` (React Context + event emitter) | `@hermes/shared-auth` |
| **URL State** | Next.js App Router `useParams`, `useSearchParams` | Next.js built-in |

### Provider Hierarchy

```
<AuthProvider>                 ← Manages user, tokens, login/logout
  <ThemeProvider>              ← Manages dark/light, persists preference
    <LocaleProvider>           ← Manages en/pt, integrates next-intl
      <WebSocketProvider>      ← Manages WS connection, event subscriptions
        {children}             ← App routes
      </WebSocketProvider>
    </LocaleProvider>
  </ThemeProvider>
</AuthProvider>
```

All providers are in `@hermes/shared-auth` except `ThemeProvider` (in `@hermes/ui`). Every app wraps its root layout with this identical provider tree.

### Server State Hook Pattern

Every server-state hook follows the same contract:

```typescript
interface ServerState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
```

Hooks that support real-time updates (via WebSocket) extend this:

```typescript
interface RealtimeState<T> extends ServerState<T> {
  lastUpdated: Date | null;
  stale: boolean;  // true if data hasn't been refreshed in >30s
}
```

**In-flight request deduplication**: Each hook maintains a module-level `Map<string, Promise<T>>` of in-flight requests keyed by resource identity. Concurrent calls to the same resource return the existing promise.

**Stale-while-revalidate**: On mount, hooks return cached data immediately (if available in a module-level cache), then fetch fresh data. The UI updates when fresh data arrives.

### Cache Strategy

```
┌──────────────────────────────────────────┐
│            Server State Cache             │
│                                           │
│  Module-level Map<cacheKey, {            │
│    data: T,                              │
│    fetchedAt: number,                    │
│    promise: Promise<T> | null, // in-flight│
│  }>                                       │
│                                           │
│  Invalidation triggers:                   │
│  • After successful mutation (send msg)   │
│  • WebSocket event (message.new)          │
│  • Manual refresh (pull-to-refresh)       │
│  • Stale threshold exceeded (>30s)        │
└──────────────────────────────────────────┘
```

Cache keys are resource-identity-based (e.g., `messages:inbox`, `messages:conversation:stationId`), not query-parameter-based.

## Consequences

### Positive
- Zero additional dependencies — no state management library added to bundle
- Simple mental model: server state in hooks, UI state in `useState`, everything else in Context
- Provider hierarchy is identical across all three apps — easy to understand, easy to test
- Module-level caches prevent duplicate network requests within the same session
- Stale-while-revalidate gives instant UI feedback while ensuring data freshness

### Negative
- Module-level caches are not garbage-collected — in long-running SPAs, cached data accumulates in memory (mitigated: cache size limits per resource type, eviction by LRU)
- React Context re-renders all consumers when value changes — must memoize context values carefully
- No devtools for state inspection (unlike Redux DevTools)
- Custom hook pattern means each developer must follow the contract — enforcement is by code review, not by compiler

### Mitigations
- All Context values are memoized with `useMemo` and stable references
- Providers are split by concern (auth, theme, locale, WS) — a locale change doesn't re-render auth consumers
- `ServerState<T>` type is enforced by a base hook factory: `createServerStateHook<T>(cacheKey: string, fetcher: () => Promise<T>)`
- Cache eviction: each cache maintains a max size (100 entries for messages, 50 for conversations). LRU eviction on insert.

## Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| **Zustand** | Adds 2kB dependency for functionality React Context already provides. The app doesn't need global stores beyond auth/theme/locale. |
| **Jotai** | Atomic model is powerful but adds conceptual overhead. Team is more familiar with Context + hooks. |
| **Redux Toolkit + RTK Query** | Overkill — RTK Query's cache/normalization is useful for complex relational data, but Hermes data model is flat (messages, conversations). Adds 12kB+ dependency. |
| **TanStack Query (React Query)** | Strong contender — provides cache, dedup, stale-while-revalidate out of the box. Rejected only because it adds a dependency for patterns we can implement in ~100 lines of custom hook code. May be adopted later if cache complexity grows. |
| **Module-level caches only (no Context)** | Loss of React integration — can't trigger re-renders on cache invalidation without Context or external store |

## References

- Frontend Architect agent: `§State Management & Data Flow Architecture`
- React Context docs: `https://react.dev/reference/react/useContext`
- PoC hooks: `apps/hermes-chat/src/hooks/`