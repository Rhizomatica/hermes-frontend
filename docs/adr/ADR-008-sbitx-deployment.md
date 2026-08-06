# ADR-008: sBitx Hardware Deployment

**Status**: Accepted  
**Date**: 2026-08-06  
**Deciders**: Frontend Architect, Senior Project Manager

---

## Context

The Hermes frontend apps run on the **sBitx** — a Raspberry Pi-based HF radio transceiver. The sBitx is the primary deployment target. It runs:

- A Raspberry Pi (ARMv7 or ARM64, typically Pi 4 with 2–4 GB RAM)
- A 7-inch touchscreen (800×480 resolution, capacitive touch)
- Fully air-gapped — no internet connectivity whatsoever
- All services run locally on the same device: `hermes-backend`, `hermes-radio-daemon`, `hermes-shell`, `hermes-gps-final`, `hermes-chat-final`

The existing documents (ADRs, task lists, architecture overview) address "offline" in abstract terms — offline message queues, offline map tiles — but never mention the **sBitx hardware constraints** that fundamentally shape the frontend architecture.

## Decision

**The sBitx is the canonical deployment target. Every architectural decision must be validated against sBitx constraints.**

### sBitx Hardware Profile

| Constraint | Value | Frontend Impact |
|---|---|---|
| Architecture | ARMv7 / ARM64 | Docker images must be multi-arch (`linux/arm64`, `linux/arm/v7`) — no `linux/amd64` assumption |
| RAM | 2–4 GB total (shared with OS, backend, daemon) | Next.js must use minimal memory. SSR disabled where possible. SPA mode considered. |
| Screen | 7-inch, 800×480, capacitive touch | UI must be touch-first: large touch targets (min 44×44px), no hover-dependent interactions, viewport meta for 800×480 |
| Input | Touch-only (no physical keyboard) | No keyboard shortcuts as primary interaction. On-screen keyboard for text fields. Voice input considered for messages. |
| Internet | None (air-gapped) | Zero external CDN dependencies. All assets bundled. No Google Fonts — self-hosted fonts. PMTiles served locally. |
| Local services | All on `localhost` | API base URL is `http://localhost:<port>` or `https://localhost`. WebSocket to `ws://localhost`. No external endpoints. |
| Browser | Chromium in kiosk mode | Capacitor NOT needed for sBitx (it's a web app in kiosk mode, not a native Android app). Capacitor is for optional tablet/phone companion devices. |
| Storage | microSD card (16–64 GB) | PMTiles file (~200MB) must fit. IndexedDB limited. Log rotation required. |
| Power | Battery/solar possible | App must handle unexpected shutdowns gracefully. IndexedDB durability critical. |

### Architecture Adjustments

#### 1. Multi-Arch Docker Builds

The Dockerfile must produce `linux/arm64` and `linux/arm/v7` images:

```yaml
# docker-compose.yml (sBitx)
services:
  hermes-shell:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        APP: hermes-shell
        PORT: "4000"
    platform: linux/arm64  # or linux/arm/v7 for Pi 3
    ports:
      - "80:4000"          # sBitx typically has no other web servers
    environment:
      HERMES_API_URL: http://hermes-backend:8080
    restart: unless-stopped

  hermes-gps-final:
    platform: linux/arm64
    # ...

  hermes-chat-final:
    platform: linux/arm64
    # ...
```

#### 2. Touch-First UI (800×480)

All UI components must be tested at 800×480 viewport:

| Pattern | Standard Desktop | sBitx Adaptation |
|---|---|---|
| Minimum touch target | 24px | **44px** (per WCAG 2.2 + sBitx physical screen) |
| Font size | 14–16px | **16–18px** minimum (small screen, varying lighting) |
| Layout | Multi-column | **Single column, stacked** |
| Navigation | Sidebar / top bar | **Bottom tab bar** (thumb zone) |
| Scrollable lists | Mouse wheel | **Touch scroll with momentum**, pull-to-refresh |
| Context menus | Right-click | **Long-press** (≥500ms hold) |
| Hover states | `:hover` | **No hover-dependent UI**. Use `:active` for touch feedback. |
| Modal dialogs | Center of viewport | **Full-width at bottom** (better thumb reach) |

#### 3. Responsive Viewport Strategy

```css
/* Base styles target sBitx (800×480) — mobile-first approach */
/* Breakpoints scale UP to larger screens, not down */

@screen sm { /* ≥640px — tablet / larger phone */ }
@screen md { /* ≥768px — small laptop */ }
@screen lg { /* ≥1024px — desktop / companion device */ }
```

The `layout.tsx` viewport meta must be explicit:

```tsx
export const metadata: Metadata = {
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,        // prevent zoom on double-tap (kiosk mode)
    userScalable: false,    // kiosk mode
    viewportFit: 'cover',   // fill the 7-inch screen
  },
};
```

#### 4. Local-Only Service Map

```
┌──────────────────────────────────────────────────────┐
│                  sBitx (Raspberry Pi)                  │
│                                                       │
│  ┌──────────────────────────────────────────────┐    │
│  │              Chromium (kiosk mode)            │    │
│  │  http://localhost/                            │    │
│  │                                               │    │
│  │  ┌─────────┐  ┌──────────┐  ┌─────────────┐  │    │
│  │  │ Shell   │  │   GPS    │  │    Chat     │  │    │
│  │  │ :4000   │  │  :4001   │  │   :4002     │  │    │
│  │  └────┬────┘  └────┬─────┘  └──────┬──────┘  │    │
│  │       │            │               │         │    │
│  └───────┼────────────┼───────────────┼─────────┘    │
│          │            │               │              │
│  ┌───────┴────────────┴───────────────┴──────────┐   │
│  │              nginx (localhost)                  │   │
│  │  /      → hermes-shell:4000                    │   │
│  │  /gps   → hermes-gps-final:4001                │   │
│  │  /chat  → hermes-chat-final:4002               │   │
│  │  /api/* → hermes-backend:8080                  │   │
│  └─────────────────────────────────────────────────┘   │
│          │                                             │
│  ┌───────┴────────────────────────────────────────┐   │
│  │         Backend Services (localhost)            │   │
│  │                                                 │   │
│  │  hermes-backend        :8080 (REST API)         │   │
│  │  hermes-radio-daemon   :8081 (WebSocket)        │   │
│  │  PostgreSQL            :5432                    │   │
│  │  Redis                 :6379                    │   │
│  └─────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

#### 5. Resource Budgeting

| Resource | Budget | Enforcement |
|---|---|---|
| Frontend memory (all 3 apps combined) | 300 MB max | Monitor with `docker stats`. Next.js standalone output must not exceed 150MB per app. |
| JavaScript bundle (per app, initial load) | 500 kB gzipped | Bundle analyzer in CI. Code-split chat/GPS from shell. |
| CSS | 50 kB gzipped | Tailwind purging. No unused utility classes. |
| Fonts | Self-hosted, subset, `font-display: swap` | No Google Fonts CDN. Subset to Latin + Portuguese characters. |
| Images | All optimized, `<Image>` with WebP | Next.js Image Optimization (local, not external service). |
| PMTiles | 200 MB on microSD | One-time download to `/public/`. Updated manually. |
| IndexedDB (offline messages) | 50 MB max | Eviction policy: keep last 500 messages per conversation, drop older. |

#### 6. Kiosk Mode Considerations

The sBitx runs Chromium in kiosk mode. Frontend implications:

- No browser chrome (no address bar, no back/forward buttons) → **in-app navigation is the only navigation**
- No `window.open()` — blocked in kiosk mode → all "open" actions handled in-app
- No `beforeunload` event — app can be killed at any time (power loss) → IndexedDB with `durability: 'strict'` on critical data
- Single tab only → no cross-tab synchronization needed
- `prefers-color-scheme` may not work → theme stored in localStorage, read via flash-prevention script (already implemented in PoC)

## Consequences

### Positive
- Explicit sBitx profile gives developers a concrete target — no guessing about screen sizes or touch behavior
- Multi-arch Docker builds ensure the app runs on actual Raspberry Pi hardware, not just dev laptops
- Touch-first design benefits companion tablet/phone users too (Capacitor apps reuse the same UI patterns)
- Resource budgets prevent memory exhaustion on the shared 2GB Pi

### Negative
- Touch-first 800×480 design requires component rework — existing PoC components assume desktop viewport
- ARM Docker builds are slower in CI (QEMU emulation for `linux/arm64` on `linux/amd64` runners)
- Self-hosted fonts increase bundle size slightly vs CDN fonts (mitigated by subsetting)
- No internet means no CDN-dependent packages — all libraries must be bundled, including fonts, icons, and maps

### Mitigations
- Use `docker buildx` with QEMU for multi-arch builds in CI
- All fonts are self-hosted in `/public/fonts/` — subset to Latin + Portuguese
- MapLibre GL JS and PMTiles are already offline-ready (ADR-005)
- Lucide icons are tree-shaken and bundled — no CDN dependency
- Develop and test on an actual 800×480 viewport via Chrome DevTools device emulation

## Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| Mobile-only design (phone-first, 375px) | 800×480 is wider than a phone but shorter — phone-first layouts waste horizontal space |
| Desktop-first design (>1024px) | sBitx is the primary target — must look correct at 800×480 first |
| Capacitor as primary deployment | sBitx runs Chromium kiosk, not Android. Capacitor is for companion devices. |
| PWA with service worker | Service workers add complexity for single-tab kiosk; IndexedDB offline queue is sufficient |
| External tile server on LAN | Require LAN infrastructure — sBitx may be the only device. PMTiles is self-contained. |

## References

- sBitx transceiver: `https://www.sbitx.net/`
- Raspberry Pi 4 specs: `https://www.raspberrypi.com/products/raspberry-pi-4-model-b/`
- Docker multi-arch builds: `https://docs.docker.com/build/building/multi-platform/`
- WCAG 2.2 Target Size: `https://www.w3.org/TR/WCAG22/#target-size-minimum`
- PoC viewport patterns: `apps/hermes-chat/src/app/layout.tsx`