# HERMES Frontend — Runtime Performance Expectations

**Project**: hermes-fronted
**Last Updated**: 2026-08-06

---

## 1. Deployment Context

The canonical deployment target is the **sBitx** — a Raspberry Pi 4 (or equivalent ARM64 SBC) with:

| Resource | Available | Shared With |
|---|---|---|
| CPU | 4× Cortex-A72 @ 1.5GHz | OS, hermes-backend, PostgreSQL, Redis, radio-daemon, nginx |
| RAM | 2–4 GB total | All of the above |
| GPU | VideoCore VI (OpenGL ES 3.1) | Chromium (WebGL for MapLibre) |
| Storage | microSD (16–64 GB) | OS, PMTiles (~200MB), IndexedDB, logs |
| Display | 7-inch, 800×480, 60Hz | N/A (dedicated kiosk) |
| Network | None (air-gapped) | N/A |
| Power | 5V DC (may be battery/solar) | Entire system |

**Key constraint**: Everything runs on one device. No offloading. No cloud. No CDN. All processing is local.

---

## 2. Memory Budget

### Per-Process Targets

| Process | Target (idle) | Peak (under load) | Notes |
|---|---|---|---|
| **hermes-shell** (static export) | 0 MB (served by nginx) | 0 MB | Static export eliminates Node.js process entirely |
| **hermes-gps-final** (standalone) | 60–80 MB | 120 MB | MapLibre tiles in GPU memory; PMTiles reads via `fetch` |
| **hermes-chat-final** (standalone) | 60–80 MB | 150 MB | IndexedDB + message list DOM; file uploads buffered in memory |
| **nginx** | 5–10 MB | 20 MB | Static file serving + reverse proxy |
| **Chromium** (kiosk) | 150–200 MB | 300–400 MB | Single tab, 800×480 viewport. GPU acceleration for WebGL |
| **Total frontend** | ~300 MB | ~650 MB | |

**Memory reduction strategies**:
- All three apps share a single `node_modules` via npm workspaces (no duplication)
- Static export for shell eliminates one Node.js process
- `--max-old-space-size=128` per Node.js process (GPS and Chat)
- MapLibre GL JS: limit tile cache to 512 tiles (~50MB GPU memory)
- IndexedDB: evict messages older than 90 days; max 500 per conversation
- Chromium flags: `--disable-dev-shm-usage`, `--disable-extensions`, `--disable-sync`

### Total System Memory (2GB Pi)

```
┌─────────────────────────────────────────────────────────┐
│               2GB RAM Budget (approximate)               │
│                                                          │
│  OS + kernel              ████  150 MB                  │
│  Chromium kiosk           ██████████  350 MB            │
│  hermes-gps (standalone)  ███  80 MB                    │
│  hermes-chat (standalone) ███  80 MB                    │
│  nginx                    █  10 MB                      │
│  hermes-backend           ████  150 MB                  │
│  PostgreSQL               ████  150 MB                  │
│  Redis                    ██  50 MB                     │
│  radio-daemon             ██  50 MB                     │
│  Buffer / cache           ██████████████  580 MB        │
│                                                          │
│  Used: ~1,070 MB    Free: ~930 MB                       │
└─────────────────────────────────────────────────────────┘
```

**On a 4GB Pi**: All processes have comfortable headroom. The 2GB Pi is tight but viable with `max-old-space-size` limits.

**OOM risk**: If Chromium or a Node.js process leaks memory, the OOM killer will terminate the largest process (Chromium). This is recoverable — Chromium restarts in kiosk mode. IndexedDB survives the restart.

---

## 3. CPU Performance Targets

### Startup (Cold Boot)

| Operation | Target | Notes |
|---|---|---|
| Boot to login screen | < 15 seconds | Chromium kiosk auto-start. Static shell loads immediately from nginx. |
| Login request | < 2 seconds | Localhost HTTP to hermes-backend. No network latency. |
| GPS app load | < 3 seconds | MapLibre initializes WebGL context. PMTiles metadata reads. |
| Chat app load (conversation list) | < 2 seconds | REST API to localhost. IndexedDB warm cache. |
| Chat screen load (open conversation) | < 2 seconds | Message fetch + DOM render. 50 messages initial view. |

### Interaction (User Touch)

| Action | Target (p95) | Notes |
|---|---|---|
| Touch response (button tap) | < 100ms | CSS `touch-action: manipulation` eliminates 300ms delay |
| Scroll (message list) | 60fps (16ms/frame) | Lazy pagination limits DOM nodes. No virtualization needed at 50 messages. |
| Map pan/zoom | 30fps (33ms/frame) | MapLibre WebGL on VideoCore VI. PMTiles local reads. |
| Map marker update (GPS) | < 500ms | Fly-to animation. Smooth interpolation. |
| Message send (text only) | < 500ms | POST to localhost backend → accepted → "Queued" UI feedback |
| Encrypted message decrypt | < 2 seconds | `POST /api/messages/uncrypt/:id` to localhost. Backend handles crypto. |
| File upload (500KB max per HF) | < 3 seconds | Localhost transfer. Progress bar shown for >1 second. |

### Background Operations

| Operation | Target | Notes |
|---|---|---|
| WebSocket heartbeat | Every 30 seconds | Localhost — negligible CPU |
| GPS position update (via WS) | As received (typically 1/sec) | Map marker update is throttled to 2fps if high-frequency |
| Message delivery status polling | Every 30 seconds | `GET /api/messages/{id}/status` per undelivered message. Batch if >5 pending. |
| IndexedDB eviction | On conversation close or app background | Async, non-blocking |
| PMTiles tile loading | On-demand (map pan/zoom) | Byte-range reads from local file. Cached in GPU memory. |

---

## 4. Bundle Size Budgets

| App | JS (gzipped) | CSS (gzipped) | Fonts | Images | Total (uncompressed) |
|---|---|---|---|---|---|
| **hermes-shell** (static) | < 100 KB | < 30 KB | 50 KB | 20 KB | < 5 MB |
| **hermes-gps-final** | < 200 KB | < 30 KB | 50 KB | 20 KB | < 10 MB |
| **hermes-chat-final** | < 250 KB | < 30 KB | 50 KB | 20 KB | < 12 MB |

**Excluded from bundle (loaded separately)**:
- `maplibre-gl`: ~200 KB gzipped (code-split via `next/dynamic`, loaded only when GPS page opens)
- `pmtiles`: ~15 KB gzipped
- `brazil.pmtiles`: ~200 MB on disk (not in bundle — served from `/public/`)

**Enforcement**: CI bundle-size job warns if any app's standalone output exceeds 150MB (which would indicate dependency bloat, since app code itself is <12MB).

---

## 5. MapLibre GL JS Performance (GPS App)

### GPU Rendering on Raspberry Pi

| Metric | Target | Notes |
|---|---|---|
| Tile render time (per frame) | < 16ms (60fps target) | VideoCore VI handles up to ~100 vector features per frame |
| Style switch (light ↔ dark) | < 500ms | `map.setStyle()` rebuilds GPU buffers |
| Marker animation | CSS `transform` with `will-change` | GPU-composited. No repaint. |
| Tile cache | 512 tiles max | ~50MB GPU memory at 512×512 per tile |
| Zoom level range | 2–14 | Beyond 14, tile density exceeds Pi GPU capacity |

### Degradation Modes

| Condition | Behavior |
|---|---|
| Map zoomed out (level 2–6) | Renders ~20 tiles. 60fps achievable. |
| Map zoomed in (level 10–14) | Renders ~30 tiles. 30fps. No jank. |
| Rapid pan/zoom (user gesture) | Tile loading throttled to 4 concurrent requests. Lower-res tiles shown while loading. |
| PMTiles file missing | Error overlay shown. Coordinates still display. GPS tracking still works. |

---

## 6. Chromium Kiosk Performance

### Rendering Pipeline

```
Touch input → Chromium compositor → GPU (VideoCore VI)
                 │
                 ▼
          React reconciliation (virtual DOM)
                 │
                 ▼
          DOM mutation (if state changed)
                 │
                 ▼
          Chromium layout → paint → composite → GPU → display
```

**Optimizations**:
- `content-visibility: auto` on off-screen message list items (Chromium skips rendering)
- `will-change: transform` on animated elements (marker, scroll position)
- `contain: layout style` on chat bubbles (isolates layout recalculations)
- No `@media (prefers-color-scheme)` in CSS (uses Tailwind `dark:` variant + localStorage — avoids media query recalculation)
- `image-rendering: crisp-edges` on the map canvas (disables anti-aliasing on MapLibre — appropriate for vector maps)

### DOM Node Budget

| Component | Max DOM Nodes | Notes |
|---|---|---|
| Message list (visible) | ~2,000 nodes | 50 messages × ~40 nodes each |
| Conversation list (visible) | ~1,500 nodes | 20 conversations × ~75 nodes each |
| Map (single canvas element) | ~10 nodes | MapLibre renders to a `<canvas>` — DOM cost is near-zero |
| Chat input | ~50 nodes | Text field + buttons |
| Total per page | < 5,000 nodes | Well within Chromium's comfort zone (~50,000 nodes before jank) |

**Message list growth**: If a conversation has 10,000 messages, only the most recent ~500 are in the DOM (lazy pagination via `useScrollPager` with 30-message page size). Older messages are in IndexedDB, loaded on scroll-up. DOM never exceeds 2,000 message-related nodes.

---

## 7. Startup Sequence (Cold Boot)

```
T+0s    Power on
T+5s    Kernel + systemd init
T+8s    PostgreSQL, Redis start
T+10s   hermes-backend starts
T+12s   hermes-radio-daemon starts
T+14s   nginx starts, serves hermes-shell (static)
T+15s   Chromium kiosk auto-launches → http://localhost/
T+16s   Shell renders login page (static HTML from nginx — instant)
T+17s   User sees login form
T+20s   User logs in → POST /api/auth/login (localhost)
T+21s   App selector page renders (static from nginx)
T+22s   User taps "GPS" → Chromium navigates to /gps
T+23s   hermes-gps-final standalone server responds
T+25s   MapLibre initializes WebGL, loads PMTiles metadata
T+26s   Map renders, GPS marker appears
```

**Total time: power-on to GPS map visible = ~26 seconds.**

This assumes `hermes-gps-final` and `hermes-chat-final` are already running as systemd services (started at boot). If they need to cold-start on first request, add 2–3 seconds per app.

---

## 8. Battery / Power Considerations

The sBitx may run on battery or solar. Frontend power impact:

| State | Estimated Power (Pi 4) | Notes |
|---|---|---|
| Idle (Chromium showing static page) | ~3.5W | GPU idle, CPU near-idle |
| GPS active (map rendering, 1fps marker update) | ~4.5W | GPU active (WebGL), moderate CPU |
| Chat active (message list scrolling) | ~4.0W | CPU moderate (DOM updates), GPU idle |
| File upload (500KB) | ~4.0W | Brief CPU spike (<3 seconds) |
| WebSocket idle (heartbeat) | ~3.5W | Negligible — localhost, no radio transmission |

**Frontend does not control HF radio transmission power.** The Mercury modem and amplifier are separate from the Pi's power budget.

**Optimization**: If running on battery, the GPS map can reduce refresh rate from continuous to "on-demand" (tap to refresh). This reduces GPU power by ~1W.

---

## 9. What Happens Under Load

### Scenario A: GPS Tracking + Chat Open Simultaneously

| Resource | Usage |
|---|---|
| RAM | GPS (80MB) + Chat (80MB) + Chromium (350MB with both tabs) = ~510MB |
| CPU | GPS: ~15% (WebGL rendering). Chat: ~5% (idle). Total: ~20% of one core. |
| GPU | GPS: ~60% (MapLibre). Chat: 0%. |
| Network | Both apps communicate with localhost services. Zero external traffic. |

**Verdict**: Comfortable. The Pi 4 handles both simultaneously.

### Scenario B: 10,000-Message Conversation

| Resource | Behavior |
|---|---|
| RAM | Message data in IndexedDB: ~5MB (500 bytes/msg × 10,000). In-memory state: ~1MB (last 500 messages). |
| DOM | Only 50 visible messages in DOM (~2,000 nodes). Older messages loaded on scroll-up. |
| CPU | Scroll up → load 30 more messages from IndexedDB → <50ms. Smooth 60fps scroll. |
| First load | Fetch 50 most recent messages from backend → <500ms. |

**Verdict**: Handles well. Lazy pagination keeps DOM and memory bounded.

### Scenario C: GPS Map Zoomed to City Level (Zoom 14)

| Resource | Behavior |
|---|---|
| GPU | ~30 tiles rendered. ~60% GPU utilization. 25–30fps. |
| RAM | Tile cache: ~50MB GPU memory. |
| Interaction | Pan at zoom 14: tiles load from PMTiles via byte-range reads. ~100ms per new tile (local file). |

**Verdict**: Usable. Not 60fps-smooth at high zoom, but functional for a field radio system.

---

## 10. Performance Testing Checklist

Before Phase 2 (GPS) and Phase 3 (Chat) are considered complete, verify:

### GPS
- [ ] Map renders in < 3 seconds on Raspberry Pi 4 (cold start)
- [ ] Map pan/zoom at 25+ fps at zoom level 10
- [ ] Light ↔ dark theme switch completes in < 500ms
- [ ] GPS marker updates at 1fps without jank
- [ ] App stays under 120MB RAM after 1 hour of continuous GPS tracking
- [ ] Tile error overlay appears within 2 seconds of PMTiles file missing

### Chat
- [ ] Conversation list loads in < 2 seconds (50 conversations)
- [ ] Chat screen opens in < 2 seconds (50 messages)
- [ ] Scroll-up loads 30 more messages in < 500ms
- [ ] 10,000-message conversation: scroll is smooth (no jank), memory < 150MB
- [ ] Message send (text): "Queued" feedback in < 500ms
- [ ] File upload (500KB): progress bar shown, completes in < 3 seconds
- [ ] Encrypted message decrypt: < 2 seconds
- [ ] Offline queue: 100 queued messages drain on reconnect without blocking UI

### Both Apps
- [ ] 2GB Pi: no OOM kills after 24 hours of normal usage
- [ ] 4GB Pi: comfortable headroom (verify with `free -h`)
- [ ] Chromium DevTools Performance tab: no long tasks (>50ms) during normal interaction
- [ ] Lighthouse score (desktop, localhost): Performance >90, Accessibility 100

---

## 11. What We Don't Optimize (Yet)

These are explicitly NOT performance targets for Phase 1–3:

- **SSR streaming or ISR**: sBitx is a single-user kiosk. SSR provides no benefit. All rendering is client-side.
- **Service Worker caching strategies beyond app shell**: The app runs on localhost. Cache hits are effectively instant. Service Worker adds complexity for no latency benefit on localhost.
- **Web Workers for heavy computation**: No heavy computation exists in the frontend. Encryption/decryption happens on the backend. Map tile rendering is GPU-accelerated.
- **CDN or edge caching**: No internet connection. No CDN. All assets are local.
- **Virtual scrolling (windowing) for message list**: At 500 messages max in DOM, windowing is unnecessary. If conversations regularly exceed 500 visible messages, re-evaluate.

---

## 12. References

- [ADR-005: Map Tile Strategy](/docs/adr/ADR-005-map-tiles.md)
- [ADR-008: sBitx Hardware Deployment](/docs/adr/ADR-008-sbitx-deployment.md)
- [ADR-006: State Management](/docs/adr/ADR-006-state-management.md)
- [Engineering Standards §9.3: Bundle Size Budget](/docs/governance/engineering-standards.md)
- [Raspberry Pi 4 Performance: MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js/discussions/281)
- [Chromium kiosk mode flags](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/chrome/common/chrome_switches.cc)