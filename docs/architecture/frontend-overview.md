# HERMES Frontend — Architecture Overview

**Project**: hermes-fronted
**Last Updated**: 2026-08-06
**Version**: 1.0.0

---

## 1. System Context

The Hermes frontend monorepo provides the user interface for the HERMES (High-frequency Emergency and Rural Multimedia Exchange System) platform. The **canonical deployment target is the sBitx** — a Raspberry Pi-based HF radio transceiver with a 7-inch touchscreen (800×480), fully air-gapped, running all services locally.

It consumes two backend systems, both running on the same device:

| System | Purpose | Protocol | Local URL |
|---|---|---|---|
| [hermes-backend](https://github.com/Rhizomatica/hermes-backend) | REST API: auth, messages, files, stations, GPS data | HTTP (localhost) | `http://localhost:8080` |
| [hermes-radio-daemon](https://github.com/Rhizomatica/hermes-radio-daemon) | Real-time events: GPS position, message delivery, station status | WebSocket `hermes-v1` | `ws://localhost:8081` |

### Deployment Targets

| Target | Hardware | Screen | Input | Network | Browser |
|---|---|---|---|---|---|
| **sBitx** (primary) | Raspberry Pi 4, 2–4GB RAM, ARM64 | 7-inch, 800×480 | Touch-only (capacitive) | None (air-gapped) | Chromium kiosk |
| Tablet / Phone (companion) | Android device | Variable | Touch | LAN via Wi-Fi | Capacitor WebView |
| Desktop (development) | x86_64 laptop | Variable | Mouse + keyboard | Internet | Chrome / Firefox |

```
┌─────────────────────────────────────────────────────────────┐
│                     HERMES Frontend                         │
│                                                             │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ hermes-shell │  │ hermes-gps-final │  │hermes-chat-   │ │
│  │   :4000      │  │     :4001        │  │   final :4002 │ │
│  │              │  │                  │  │               │ │
│  │ • Login      │  │ • Offline map    │  │ • Messaging   │ │
│  │ • App select │  │ • GPS tracking   │  │ • File upload │ │
│  │ • Nav hub    │  │ • Breadcrumbs    │  │ • Encryption  │ │
│  └──────┬───────┘  └────────┬─────────┘  └───────┬───────┘ │
│         │                   │                    │         │
│         └───────────────────┴────────────────────┘         │
│                             │                               │
│  ┌──────────────────────────┴──────────────────────────┐   │
│  │                 Shared Packages                       │   │
│  │                                                       │   │
│  │  @hermes/api          @hermes/shared-auth              │   │
│  │  • API client          • AuthProvider/useAuth          │   │
│  │  • Types               • WebSocketProvider             │   │
│  │  • Normalize utils     • LocaleProvider                │   │
│  │                        • useAuthGuard                  │   │
│  │                                                       │   │
│  │  @hermes/ui            @hermes/tailwind-config          │   │
│  │  • Shared components   • Design tokens                 │   │
│  │  • ThemeProvider       • Map style tokens              │   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Application Architecture

### 2.1 Deployment Modes

| Mode | Layout | Auth |
|---|---|---|
| **Co-deployed** (all apps) | nginx reverse proxy: `/` → shell, `/gps` → GPS, `/chat` → chat | Shared HttpOnly cookie (same origin) |
| **Standalone** (single app) | App at root `/` | Local login page (fallback) |

### 2.2 App Responsibilities

| Concern | Shell | GPS Final | Chat Final |
|---|---|---|---|
| Login page | ✅ Primary | ✅ Fallback (standalone) | ✅ Fallback (standalone) |
| App navigation | ✅ | ← Back link | ← Back link |
| GPS map & tracking | — | ✅ | — |
| Messaging & files | — | — | ✅ |
| Radio info dashboard | — | — | ✅ |
| Theme toggle | ✅ | ✅ | ✅ |
| Locale toggle | ✅ | ✅ | ✅ |
| WebSocket connection | ✅ (provider) | ✅ (consumer) | ✅ (consumer) |

---

## 3. Component Tree

### 3.1 Shared Provider Hierarchy (All Apps)

```
<html>
  <body>
    <AuthProvider>                  ← @hermes/shared-auth
      <ThemeProvider>               ← @hermes/ui
        <LocaleProvider>            ← @hermes/shared-auth (next-intl)
          <WebSocketProvider>       ← @hermes/shared-auth
            {page content}
          </WebSocketProvider>
        </LocaleProvider>
      </ThemeProvider>
    </AuthProvider>
  </body>
</html>
```

### 3.2 Shell App

```
/
├── /login
│   └── LoginPage
│       ├── HermesLogo
│       ├── LoginForm (email, password, submit)
│       ├── ThemeToggle
│       └── LocaleToggle
│
└── / (authenticated)
    └── AppSelectorPage
        ├── AppHeader (station name, user info)
        ├── NavCard("GPS Viewer") → /gps
        ├── NavCard("Chat") → /chat
        ├── LogoutButton
        ├── ThemeToggle
        └── LocaleToggle
```

### 3.3 GPS App

```
/gps
└── GpsPage
    ├── MapView (maplibre-gl, PMTiles)
    │   ├── StationMarker (pulsing, direction arrow)
    │   ├── BreadcrumbTrail (polyline, toggle)
    │   ├── NavigationControl
    │   └── ScaleControl
    └── CoordinatePanel (bottom overlay)
        ├── AppTitle ("HERMES GPS")
        ├── ThemeToggle + LocaleToggle
        ├── CoordItem (latitude: decimal + DMS)
        ├── CoordItem (longitude: decimal + DMS)
        ├── GpsStatusBadge (fix quality, satellites, HDOP)
        ├── LastUpdated (timestamp + countdown)
        ├── BreadcrumbToggle
        └── RefreshButton
```

### 3.4 Chat App

```
/chat
├── / (conversation list)
│   └── ConversationListPage
│       ├── Navbar (burger menu: theme, locale, radio info, logout)
│       ├── SearchInput
│       ├── ConversationList
│       │   └── ConversationItem[] (avatar, preview, unread, time)
│       └── NewChatFab → /new-chat
│
├── /chat/[station]
│   └── ChatScreen
│       ├── ChatHeader (back, station name, online status, refresh)
│       ├── NextSyncBadge
│       ├── MessageList
│       │   ├── LoadingSpinner (top, history load)
│       │   ├── DateDivider
│       │   └── MessageBubble[]
│       │       ├── DeleteMessageButton (own messages)
│       │       ├── LockIcon / UnlockButton (encrypted)
│       │       ├── FileAttachment (images, audio, docs)
│       │       ├── DoubleCheck (sent/synced status)
│       │       └── Timestamp
│       ├── NewMessagesCue (floating button)
│       ├── ErrorBanner
│       ├── AttachmentPreview (pre-send)
│       └── MessageInput
│           ├── PaperclipButton → FileInput
│           ├── LockToggle → PasswordField
│           ├── TextInput
│           └── SendButton
│
├── /new-chat
│   └── NewChatPage
│       ├── Navbar (back button)
│       ├── SearchInput
│       └── StationList → StationItem[]
│
└── /radio-info
    └── RadioInfoPage
        ├── Navbar (back button)
        ├── SysInfo (nodename, domain, version, uptime)
        └── CallerList (recent callers)
```

---

## 4. Data Flow

### 4.1 Server State Fetching

```
Component
    │
    ▼
useChatData() / useGpsCoords() / useStations()
    │
    ├── Check module-level cache
    │   ├── Hit → return cached data, refresh in background
    │   └── Miss → fetch from API
    │
    ├── Check in-flight request map
    │   ├── Exists → return existing Promise
    │   └── None → create new fetch
    │
    ▼
fetch() → Next.js API Route → @hermes/api (hermesGet/hermesPost)
    │                              │
    │                         Node.js https / Browser fetch
    │                              │
    │                         hermes-backend
    │
    ▼
Store in module-level cache → setState(data) → re-render
```

### 4.2 WebSocket Event Flow

```
hermes-radio-daemon
    │
    │ WebSocket (hermes-v1 subprotocol)
    ▼
WebSocketProvider (@hermes/shared-auth)
    │
    ├── Parse JSON message
    ├── Route to subscribers by eventType
    │
    ├── gps.position ────→ useGpsCoords.subscribe() → setCoords()
    ├── gps.fix ─────────→ useGpsCoords.subscribe() → setFix()
    ├── message.new ─────→ useChatData.subscribe() → setMessages()
    ├── message.delivered → useChatData.subscribe() → setSyncedIds()
    ├── station.online ──→ useChatData.subscribe() → setOnlineStatus()
    └── caller.new ──────→ useCallerList.subscribe() → setCallers()
```

### 4.3 Offline Message Queue Flow

```
User taps "Send"
    │
    ▼
useSendMessage.sendMessage()
    │
    ├── connectionState === 'connected'?
    │   ├── Yes → POST /api/messages → success
    │   └── No  → enqueue to IndexedDB
    │
    ▼
On reconnect (connectionState → 'connected'):
    │
    useOfflineQueue.drainQueue()
    │
    ├── For each pending (FIFO):
    │   ├── POST /api/messages
    │   ├── Success → delete from IndexedDB, insert optimistic message
    │   └── Failure → retryCount++; if >3 → status: 'failed'
    │
    ▼
UI updates: pending count badge, failed message retry button
```

---

## 5. Key Design Decisions

| Decision | Rationale | ADR |
|---|---|---|
| Dual-mode API client (Node.js https + browser fetch) | Single interface for SSR and client code | ADR-001 |
| Shared WebSocket provider with event subscriptions | One connection serves all apps | ADR-002 |
| HttpOnly cookie (prod) + localStorage (dev) auth | Security + dev convenience | ADR-003 |
| IndexedDB offline message queue | Persistent, structured, async | ADR-004 |
| PMTiles + MapLibre GL JS for offline maps | Single file, zero infrastructure | ADR-005 |
| React Context + hooks (no state library) | Sufficient for flat data model | ADR-006 |
| Path-based reverse proxy for multi-app deployment | Individually deployable, unified auth | ADR-007 |

---

## 6. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | 22 LTS |
| Monorepo | Turborepo | 2.x |
| Framework | Next.js (App Router) | 16.x |
| UI | React | 19.x |
| Language | TypeScript (strict) | 5.x |
| Styling | Tailwind CSS | 3.4.x |
| i18n | next-intl | 4.x |
| Icons | lucide-react | 1.x |
| Maps | maplibre-gl + pmtiles | 5.x / 3.x |
| Mobile | Capacitor | 7.x |
| Testing | Vitest + Playwright | latest |
| Linting | ESLint + Prettier | latest |

---

## 7. Directory Structure

```
hermes-fronted/
├── apps/
│   ├── hermes-chat/              # PoC (immutable reference)
│   ├── hermes-gps/               # PoC (immutable reference)
│   ├── hermes-gps-new/           # Empty (remove)
│   ├── hermes-shell/             # Login + navigation hub
│   ├── hermes-gps-final/         # GPS viewer (production)
│   └── hermes-chat-final/        # Chat client (production)
│
├── packages/
│   ├── api/                      # @hermes/api
│   │   └── src/
│   │       ├── index.ts          # hermesGet, hermesPost, etc.
│   │       ├── types.ts          # Message, Conversation, Station, etc.
│   │       ├── normalize.ts      # destArray, stationId, canonicalize
│   │       └── conversation.ts   # buildConversations, filterConversation
│   │
│   ├── ui/                       # @hermes/ui
│   │   └── src/
│   │       ├── ThemeProvider.tsx
│   │       ├── ConfirmDialog.tsx
│   │       ├── ErrorBanner.tsx
│   │       ├── LoadingSpinner.tsx
│   │       ├── PasswordDialog.tsx
│   │       └── SearchInput.tsx
│   │
│   ├── tailwind-config/          # @hermes/tailwind-config
│   │   ├── base.ts               # Design tokens
│   │   └── map-tokens.ts         # Map color tokens
│   │
│   └── shared-auth/              # @hermes/shared-auth
│       └── src/
│           ├── AuthProvider.tsx
│           ├── useAuth.ts
│           ├── useAuthGuard.ts
│           ├── WebSocketProvider.tsx
│           ├── LocaleProvider.tsx
│           ├── tokenStore.ts
│           └── wsEvents.ts
│
├── docs/
│   ├── adr/                      # Architecture Decision Records
│   ├── tasks/                    # Phase task lists
│   └── architecture/             # Architecture docs
│
├── turbo.json
├── tsconfig.base.json
└── package.json
```

---

## 8. Standards & Conventions

| Rule | Enforcement |
|---|---|
| No `any` types | ESLint `@typescript-eslint/no-explicit-any: error` |
| No raw `fetch` in components | Code review |
| All user-facing strings via `useTranslations()` | ESLint `no-hardcoded-strings` rule |
| No CSS magic values — use design tokens | Tailwind `theme()` function |
| Components have JSDoc | Code review |
| All API routes validate input | Code review |
| Accessibility: `aria-label` on icon buttons | `eslint-plugin-jsx-a11y` |
| No `console.log` in production | ESLint `no-console: error` |
| Conventional commits | `commitlint` |

---

## 9. References

- [ADR-001: API Client Architecture](../adr/ADR-001-api-client.md)
- [ADR-002: WebSocket Client Architecture](../adr/ADR-002-websocket-client.md)
- [ADR-003: Authentication Strategy](../adr/ADR-003-auth-strategy.md)
- [ADR-004: Offline Message Queue](../adr/ADR-004-offline-queue.md)
- [ADR-005: Map Tile Strategy](../adr/ADR-005-map-tiles.md)
- [ADR-006: State Management](../adr/ADR-006-state-management.md)
- [ADR-007: Multi-App Deployment](../adr/ADR-007-multi-app-deployment.md)
- [Phase 1 Task List](../tasks/phase-1-shell-foundation-login.md)
- [Phase 2 Task List](../tasks/phase-2-gps.md)
- [Phase 3 Task List](../tasks/phase-3-chat.md)
- [hermes-backend](https://github.com/Rhizomatica/hermes-backend)
- [hermes-radio-daemon](https://github.com/Rhizomatica/hermes-radio-daemon)