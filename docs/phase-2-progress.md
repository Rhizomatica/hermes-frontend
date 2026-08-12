# Phase 2 — GPS Application · Progress Tracker

**Branch**: `feature/1.1.0-sbitx-design-tokens`  
**Updated**: 2026-08-12  
**Status**: 🚧 In Progress — 7/12 tasks complete

---

## Task Status

| ID | Task | Status | Commit | Notes |
|---|---|---|---|---|
| **Week 3** | **Map Foundation & Real-Time GPS** | 🚧 | | |
| 2.1.1 | WebSocketProvider in shared-auth | ✅ | `06d5bec` | Done in Phase 1 |
| 2.1.2 | Add WebSocketProvider to layouts | ✅ | `e937faf` | All three layout.tsx |
| 2.1.3 | useGpsCoords hook | ✅ | `14921f2` | WS subscription + REST fallback + test |
| 2.1.4 | GpsPosition type + GET /api/gps | ✅ | `0e428af` | Types in @hermes/api, route handler |
| 2.1.5 | MapView component | ✅ | `a46b2b7` | Maplibre GL + PMTiles, theme-aware |
| 2.1.6 | GPS main page | ✅ | `d7113e8` | Full-screen map + CoordinatePanel + i18n |
| **Fixes** | **Build fixes** | ✅ | | |
| — | useRef strict mode | ✅ | `0eba352` | WebSocketProvider reconnectTimeout |
| — | TS strict mode in tests | ✅ | `9943fd2` | Test file mock.calls type narrowing |
| — | SSR-safe useWebSocket stub | ✅ | `9cfb21c` | Return stub during SSR/build |
| — | @testing-library/react dep | ✅ | `9cfb21c` | devDependency for test file |
| **Week 4** | **GPS Advanced Features** | 📋 | | |
| 2.2.1 | GPS breadcrumb trail | ✅ | `2326267` | API route, useGpsHistory hook, BreadcrumbToggle, MapView gradient polyline, i18n |
| 2.2.2 | GPS status indicators | 📋 | | GpsStatusBadge, fix quality, satellites, HDOP |
| 2.2.3 | Offline GPS cache | 📋 | | gpsCache.ts, localStorage, "last known" badge |
| 2.2.4 | Coordinate copy functionality | 📋 | | Already in GPS main page (click-to-copy) |
| **Week 5** | **Tile Management & Polish** | 📋 | | |
| 2.3.1 | Tile download script | 📋 | | scripts/download-tiles.sh, checksum, progress |
| 2.3.2 | Map marker customization | 📋 | | SVG marker, direction arrow, accuracy circle |
| 2.3.3 | GPS-specific i18n | 📋 | | Already done in 2.1.6 (en.json + pt.json) |
| 2.3.4 | GPS E2E tests | 📋 | | Playwright + manual checklist |

---

## Phase 2 Quality Gates

| Gate | Status | Notes |
|---|---|---|
| `npm run build` — zero TS errors | ✅ | hermes-gps-final builds successfully |
| `npm test` — >80% GPS hooks | ⏳ | Test file exists, not yet executed |
| Map renders offline with PMTiles | ⏳ | Requires tile file |
| WS connection updates coordinates | ⏳ | Requires backend + daemon running |
| REST polling fallback when WS disconnected | ⏳ | Requires backend + daemon |
| Marker moves on coordinate change | ⏳ | Requires GPS data |
| Breadcrumb trail renders | ⏳ | Task 2.2.1 not yet done |
| Dark/light theme transitions | ⏳ | Component built, not visually tested |
| All i18n keys in en.json + pt.json | ✅ | 8 keys in both language files |
| Offline cache: "last known" badge | ⏳ | Task 2.2.3 not yet done |
| Coordinate copy to clipboard | ✅ | Built into main page |
| Tile download script works | ⏳ | Task 2.3.1 not yet done |

---

## Architecture Map (Post-Phase-2-Week-3)

```
apps/hermes-gps-final/
├── src/
│   ├── app/
│   │   ├── page.tsx              ← Full-screen map + coordinate overlay
│   │   └── api/gps/route.ts      ← GET /api/gps proxy
│   ├── components/
│   │   ├── MapView.tsx            ← Maplibre GL + PMTiles + marker + theme
│   │   └── CoordinatePanel.tsx   ← Lat/Lon display + copy + theme/locale toggles
│   ├── hooks/
│   │   ├── useGpsCoords.ts       ← WS subscription + REST fallback polling
│   │   └── useGpsCoords.test.ts  ← Unit tests (WS events, REST fallback, cleanup)
│   └── lib/
│       └── mapStyle.ts           ← buildStyle(isDark) pure function
├── messages/
│   ├── en.json                   ← 8 GPS i18n keys
│   └── pt.json                   ← 8 GPS i18n keys
└── public/
    ├── manifest.json
    └── sw.js