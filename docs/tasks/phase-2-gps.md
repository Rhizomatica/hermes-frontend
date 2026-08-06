# Phase 2 — GPS Application Task List

**Project**: hermes-fronted
**Phase Duration**: Weeks 3–5
**Prerequisites**: Phase 1 complete — `hermes-gps-final` scaffolded, auth-aware
**Generated**: 2026-08-06

## Phase Objectives

Deliver a production-ready GPS coordinate viewer with offline map, real-time position updates via `hermes-radio-daemon` WebSocket, breadcrumb trail, and full i18n support. The app must work fully offline (map tiles served from local PMTiles file) and provide a responsive UI with theme support.

---

## Week 3: Map Foundation & Real-Time GPS

### [ ] Task 2.1.1: `WebSocketProvider` in `@hermes/shared-auth`

**Description**: Implement the shared `WebSocketProvider` that connects to `hermes-radio-daemon` and provides an event-based subscription model. This is a prerequisite for both GPS (Phase 2) and Chat (Phase 3).

**Acceptance Criteria**:
- [ ] `WebSocketProvider` wraps children with WS context
- [ ] Connects to `NEXT_PUBLIC_RADIO_DAEMON_WS_URL` (default `ws://localhost:8081`)
- [ ] Connection state exposed: `connecting | connected | disconnected | reconnecting`
- [ ] `subscribe<T>(eventType, callback)` returns unsubscribe function
- [ ] `send(eventType, payload)` for uplink events
- [ ] Reconnection with exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s max
- [ ] Heartbeat: `ping` every 30s, disconnect if no `pong` within 10s
- [ ] Subscribers receive typed payloads
- [ ] No memory leaks: unsubscribe removes listener, provider cleanup on unmount

**Files to Create/Edit**:
- `packages/shared-auth/src/WebSocketProvider.tsx` — provider + `useWebSocket` hook
- `packages/shared-auth/src/wsEvents.ts` — event type catalog
- `packages/shared-auth/src/index.ts` — export `WebSocketProvider`, `useWebSocket`

**Stack Notes**: Use native `WebSocket` API. No Socket.IO — raw WebSocket with `hermes-v1` subprotocol. Store subscriptions in a `Map<eventType, Set<callback>>`.

**Doc Reference**: ADR-002 §Provider API, ADR-002 §Reconnection Strategy, ADR-002 §Event Catalog

---

### [ ] Task 2.1.2: Add `WebSocketProvider` to all three app layouts

**Description**: Add `<WebSocketProvider>` to the provider hierarchy in `hermes-shell`, `hermes-gps-final`, and `hermes-chat-final` root layouts. Provider order: `AuthProvider` → `ThemeProvider` → `LocaleProvider` → `WebSocketProvider`.

**Acceptance Criteria**:
- [ ] All three `layout.tsx` files include `<WebSocketProvider>` in provider hierarchy
- [ ] WS connection starts on app mount, disconnects on unmount
- [ ] `connectionState` transitions visible in React DevTools

**Files to Edit**:
- `apps/hermes-shell/src/app/layout.tsx` — add `WebSocketProvider`
- `apps/hermes-gps-final/src/app/layout.tsx` — add `WebSocketProvider`
- `apps/hermes-chat-final/src/app/layout.tsx` — add `WebSocketProvider`

**Doc Reference**: ADR-002, ADR-006 §Provider Hierarchy

---

### [ ] Task 2.1.3: `useGpsCoords` hook

**Description**: Hook that consumes `gps.position` and `gps.fix` events from WebSocket. Falls back to REST polling (`GET /api/gps`) when WS is disconnected. Provides tri-state: `{ data, loading, error, lastUpdated, stale }`.

**Acceptance Criteria**:
- [ ] Subscribes to `gps.position` → updates `data` with `{ latitude, longitude, altitude, speed, heading }`
- [ ] Subscribes to `gps.fix` → updates `fixQuality`, `satellites`, `hdop`
- [ ] Falls back to `GET /api/gps` polling every 30s when `connectionState !== 'connected'`
- [ ] `stale` flag: `true` if last update > 60s ago
- [ ] `lastUpdated`: `Date` of last successful position update
- [ ] Cleans up subscriptions and intervals on unmount
- [ ] Unit tested with mocked WebSocket

**Files to Create/Edit**:
- `apps/hermes-gps-final/src/hooks/useGpsCoords.ts`
- `apps/hermes-gps-final/src/hooks/useGpsCoords.test.ts`

**Stack Notes**: PoC reference: `apps/hermes-gps/src/app/page.tsx` lines 42–67 (REST polling pattern). Enhance with WS subscription. GPS coordinate format: decimal degrees from NMEA `$GPGGA`.

**Doc Reference**: ADR-002 §Event Catalog (gps.position, gps.fix), ADR-006 §ServerState

---

### [ ] Task 2.1.4: API route proxy — `GET /api/gps`

**Description**: Next.js route handler that fetches current GPS coordinates from `hermes-backend` (REST fallback). Returns typed `GpsPosition` object.

**Acceptance Criteria**:
- [ ] `GET /api/gps` → fetches from backend → returns `{ latitude, longitude, altitude, speed, heading, timestamp }`
- [ ] Handles backend errors (502, timeout) → returns structured error
- [ ] Handles no GPS data (backend returns null/empty) → returns `{ data: null, message: "No GPS data available" }`
- [ ] Type-safe response using `GpsPosition` type from `@hermes/api`

**Files to Create/Edit**:
- `apps/hermes-gps-final/src/app/api/gps/route.ts`
- `packages/api/src/types.ts` — add `GpsPosition` interface

**Stack Notes**: Use `hermesGet` from `@hermes/api`. Pass auth cookie from incoming request.

**Doc Reference**: ADR-001, PoC `apps/hermes-gps/src/app/api/gps/route.ts`

---

### [ ] Task 2.1.5: `MapView` component — core

**Description**: Build the offline-capable map component using MapLibre GL JS + PMTiles. Port the validated PoC `MapView.tsx` pattern with enhancements: theme token extraction, error overlay i18n, marker customization.

**Acceptance Criteria**:
- [ ] Renders full-screen map using `maplibre-gl` with `pmtiles` protocol
- [ ] Light and dark theme styles (programmatic `StyleSpecification`)
- [ ] Station marker: pulsing dot with Hermes styling, updates position via `lat`/`lon` props
- [ ] Fly-to animation on coordinate change (duration 1.5s, zoom level configurable)
- [ ] NavigationControl (zoom + compass) top-right, ScaleControl (metric) bottom-left
- [ ] Tile missing error overlay with i18n message and `npm run download-tiles` instructions
- [ ] Dynamically imported with `ssr: false` to prevent SSR errors
- [ ] `ResizeObserver` on container for responsive map sizing

**Files to Create/Edit**:
- `apps/hermes-gps-final/src/components/MapView.tsx` — map component
- `packages/tailwind-config/src/map-tokens.ts` — theme-aware map color tokens
- `apps/hermes-gps-final/src/lib/mapStyle.ts` — `buildStyle(dark)` pure function

**Stack Notes**: PoC reference: `apps/hermes-gps/src/components/MapView.tsx` (287 lines, validated). Extract `buildStyle` to pure function. Extract color tokens to `@hermes/tailwind-config`. Register `pmtiles` protocol once per page load (singleton pattern from PoC).

**Doc Reference**: ADR-005, PoC `apps/hermes-gps/src/components/MapView.tsx`

---

### [ ] Task 2.1.6: GPS page — main view

**Description**: Compose `MapView`, coordinate display panel, and controls into the main GPS page. Auto-refreshes via `useGpsCoords`. Theme and locale toggles.

**Acceptance Criteria**:
- [ ] `MapView` full-screen background
- [ ] Bottom panel overlay with coordinates, timestamp, and controls
- [ ] Coordinates displayed in decimal degrees + DMS format
- [ ] "Last updated" timestamp with countdown to next refresh (30s)
- [ ] Manual refresh button with loading spinner
- [ ] Error banner for fetch/WS errors with retry
- [ ] Theme toggle (sun/moon) and locale toggle (EN/PT) in panel header
- [ ] All strings from `next-intl`
- [ ] Responsive: panel respects mobile safe areas, map fills remaining space

**Files to Create/Edit**:
- `apps/hermes-gps-final/src/app/page.tsx` — main GPS page
- `apps/hermes-gps-final/src/components/CoordinatePanel.tsx` — bottom panel
- `apps/hermes-gps-final/messages/en.json` — `gps` namespace
- `apps/hermes-gps-final/messages/pt.json` — `gps` namespace

**Stack Notes**: PoC reference: `apps/hermes-gps/src/app/page.tsx` lines 32–150. Extract `CoordItem` to its own component.

**Doc Reference**: PoC `apps/hermes-gps/src/app/page.tsx`, ADR-005

---

## Week 4: GPS Advanced Features

### [ ] Task 2.2.1: GPS breadcrumb trail

**Description**: Display the station's historical GPS path as a polyline on the map. Fetch history from backend, render as gradient line (recent = bright, old = faded).

**Acceptance Criteria**:
- [ ] `GET /api/gps/history` route handler proxying to backend
- [ ] `useGpsHistory` hook: fetches on mount, auto-refreshes on new position
- [ ] Polyline rendered on map via `map.addSource('breadcrumb', ...)` and `map.addLayer()`
- [ ] Color gradient from recent (orange-500) to old (orange-200)
- [ ] Toggle button in panel to show/hide breadcrumb
- [ ] Click on breadcrumb point → show tooltip with timestamp and coordinates
- [ ] Handles empty history (no polyline, no error)

**Files to Create/Edit**:
- `apps/hermes-gps-final/src/app/api/gps/history/route.ts`
- `apps/hermes-gps-final/src/hooks/useGpsHistory.ts`
- `apps/hermes-gps-final/src/components/MapView.tsx` — add breadcrumb layer logic
- `apps/hermes-gps-final/src/components/BreadcrumbToggle.tsx`

**Stack Notes**: Polyline: `map.addSource` with GeoJSON `LineString`. Use `line-gradient` paint property for recency gradient. Max 500 points (older points dropped).

**Doc Reference**: ADR-005

---

### [ ] Task 2.2.2: GPS status indicators

**Description**: Display GPS fix quality, satellite count, and HDOP in the coordinate panel. Visual indicators for fix status (no fix = red, 2D = yellow, 3D/DGPS = green).

**Acceptance Criteria**:
- [ ] Fix quality badge: icon + text ("No Fix", "2D Fix", "3D Fix", "DGPS"), color-coded
- [ ] Satellite count: number + satellite icon
- [ ] HDOP value with tooltip explaining precision
- [ ] All indicators update in real-time via `gps.fix` WS event
- [ ] Show "No GPS data" state when quality is 0 (no fix)
- [ ] i18n for all labels

**Files to Create/Edit**:
- `apps/hermes-gps-final/src/components/GpsStatusBadge.tsx`
- `apps/hermes-gps-final/src/hooks/useGpsCoords.ts` — add fix fields
- `apps/hermes-gps-final/messages/en.json` — `gps.status` namespace
- `apps/hermes-gps-final/messages/pt.json` — `gps.status` namespace

**Stack Notes**: Fix quality values per NMEA: 0=invalid, 1=GPS, 2=DGPS, 4=RTK fixed, 5=RTK float.

**Doc Reference**: ADR-002 §Event Catalog (gps.fix)

---

### [ ] Task 2.2.3: Offline GPS cache

**Description**: Cache last known position and GPS history in localStorage for display when both WS and REST are unavailable (truly offline). Show "last known" badge.

**Acceptance Criteria**:
- [ ] Last known position stored in localStorage on every successful update
- [ ] On mount, if both WS and REST fail, load cached position
- [ ] "Last known" badge displayed next to coordinates when using cached data
- [ ] Timestamp of cached position shown ("Last known: 5 minutes ago")
- [ ] Cache is cleared on logout

**Files to Create/Edit**:
- `apps/hermes-gps-final/src/hooks/useGpsCoords.ts` — add cache logic
- `apps/hermes-gps-final/src/lib/gpsCache.ts` — localStorage cache functions

**Stack Notes**: Cache key: `hermes_gps_cache`. Store as JSON: `{ position: GpsPosition, fetchedAt: number }`.

**Doc Reference**: ADR-003 (auth clear on logout)

---

### [ ] Task 2.2.4: Coordinate copy functionality

**Description**: Allow users to tap/click coordinate values to copy them to clipboard. Show brief "Copied!" feedback.

**Acceptance Criteria**:
- [ ] Click on latitude or longitude value → copies decimal value to clipboard
- [ ] "Copied!" toast/indicator appears for 2 seconds
- [ ] `navigator.clipboard.writeText()` with fallback for older browsers
- [ ] Accessible: button role, `aria-label="Copy latitude"`

**Files to Create/Edit**:
- `apps/hermes-gps-final/src/components/CoordinatePanel.tsx` — add click handler + feedback

**Stack Notes**: Use `navigator.clipboard.writeText()`. Fallback: `document.execCommand('copy')` with a temporary input element.

---

## Week 5: GPS Polish & Testing

### [ ] Task 2.3.1: Tile download script enhancement

**Description**: Port and enhance the PoC `download-tiles.sh` script. Add checksum verification, progress display, and idempotency (skip if already downloaded and checksum matches).

**Acceptance Criteria**:
- [ ] Script downloads `brazil.pmtiles` from configured URL
- [ ] SHA256 checksum verification (configurable expected hash)
- [ ] Progress bar during download
- [ ] Skips download if file exists and checksum matches
- [ ] `postinstall` hook calls script automatically
- [ ] Error message on download failure (checksum mismatch, network error, disk full)
- [ ] Configurable via env vars: `PMTILES_URL`, `PMTILES_CHECKSUM`

**Files to Create/Edit**:
- `apps/hermes-gps-final/scripts/download-tiles.sh`
- `apps/hermes-gps-final/package.json` — add `"download-tiles"` and `"postinstall"` scripts

**Stack Notes**: PoC reference: `apps/hermes-gps/scripts/download-tiles.sh`. Use `curl` with `-#` for progress bar. `sha256sum` for verification.

**Doc Reference**: ADR-005 §Tile Pipeline

---

### [ ] Task 2.3.2: Map marker customization

**Description**: Replace default MapLibre marker with Hermes-branded custom marker. Add direction arrow when heading data is available. Add accuracy circle when HDOP is available.

**Acceptance Criteria**:
- [ ] Custom SVG marker element (Hermes logo or stylized pin)
- [ ] Direction arrow rotated by `heading` degrees (NMEA true heading)
- [ ] Accuracy circle radius proportional to HDOP value
- [ ] Marker uses CSS `will-change: transform` for smooth animation
- [ ] Marker transitions between positions with CSS `transition: transform 0.5s ease`

**Files to Create/Edit**:
- `apps/hermes-gps-final/src/components/MapView.tsx` — marker element + update logic
- `apps/hermes-gps-final/public/marker.svg` — SVG marker asset

**Stack Notes**: PoC already uses custom `<div>` marker (`hermes-marker` class). Enhance the element with SVG and arrow.

**Doc Reference**: PoC `apps/hermes-gps/src/components/MapView.tsx` lines 251–256

---

### [ ] Task 2.3.3: GPS-specific i18n

**Description**: Ensure all GPS UI strings have `en` and `pt` translations. Add coordinate format preferences (decimal degrees vs DMS). Add locale-aware unit display (metric: meters, km/h, celsius).

**Acceptance Criteria**:
- [ ] All user-facing strings in `messages/en.json` and `messages/pt.json`
- [ ] Coordinate format respects locale preference
- [ ] Units displayed in metric (km/h for speed, meters for altitude)
- [ ] "Last updated" relative time uses `Intl.RelativeTimeFormat`
- [ ] Date/time display respects locale (24h vs 12h, date order)

**Files to Create/Edit**:
- `apps/hermes-gps-final/messages/en.json`
- `apps/hermes-gps-final/messages/pt.json`

**Stack Notes**: `Intl.RelativeTimeFormat` for "2 minutes ago", "há 2 minutos". `Intl.DateTimeFormat` for timestamps.

---

### [ ] Task 2.3.4: GPS manual testing + E2E

**Description**: Write manual test checklist and Playwright E2E test for the GPS flow. Test with mocked WS and REST responses.

**Acceptance Criteria**:
- [ ] Playwright test: load GPS page → see map render → see coordinates update → toggle theme → toggle breadcrumb
- [ ] Manual test checklist document: offline map render, coordinate refresh, tile error overlay, dark/light theme toggle, locale toggle, clipboard copy
- [ ] Tested on: Chrome, Firefox, Capacitor Android WebView

**Files to Create/Edit**:
- `apps/hermes-gps-final/e2e/gps.spec.ts` — Playwright test
- `docs/testing/gps-manual-checklist.md` — manual test guide

**Stack Notes**: Mock `hermes-radio-daemon` WebSocket with `ws` library in test setup. Mock REST API with Playwright route interception.

---

## Phase Quality Gates

- [ ] `npm run build` passes with zero TS errors
- [ ] `npm test` passes with >80% coverage on GPS hooks
- [ ] GPS page loads, renders offline map with PMTiles
- [ ] WebSocket connection establishes and `gps.position` events update coordinates
- [ ] REST polling fallback activates when WS disconnected
- [ ] Marker moves on coordinate change with smooth animation
- [ ] Breadcrumb trail renders historical path
- [ ] Tile error overlay shows when PMTiles file missing
- [ ] Dark/light theme transitions without map flash
- [ ] All i18n keys in `en.json` and `pt.json` — switch language, all labels update
- [ ] Offline cache: position displayed with "last known" badge when both WS and REST unavailable
- [ ] Coordinate copy to clipboard works
- [ ] `npm run download-tiles` downloads and verifies tile file