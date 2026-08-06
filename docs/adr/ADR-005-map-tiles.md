# ADR-005: Map Tile Strategy

**Status**: Accepted  
**Date**: 2026-08-06  
**Deciders**: Frontend Architect, Senior Project Manager

---

## Context

`hermes-gps-final` must display a geographic map showing the station's GPS position. Hermes stations operate in remote areas without internet access — the map must work fully offline.

The PoC (`apps/hermes-gps/src/components/MapView.tsx`) uses **PMTiles** (a single-file tile archive format) served via the `pmtiles` JavaScript library with **MapLibre GL JS** for rendering. This approach has been validated in the PoC and works offline. No external tile servers (OpenStreetMap, Mapbox) are used.

## Decision

**We will continue using the PoC-validated PMTiles + MapLibre GL JS stack with the following enhancements:**

| Component | Choice | Rationale |
|---|---|---|
| Map library | **MapLibre GL JS** `^5.3.0` | Open-source fork of Mapbox GL JS. WebGL rendering. Well-maintained. |
| Tile format | **PMTiles v3** (single `.pmtiles` file) | Cloud-optimized, random-access tile archive. No server required — entire dataset in one file. |
| Tile protocol | `pmtiles` npm package (`Protocol` class) | Registers `pmtiles://` protocol handler with MapLibre. Validated in PoC. |
| Tile data source | **Protomaps OSM extract** (Brazil region) | OpenStreetMap-derived vector tiles. Free, self-hosted. Download script `download-tiles.sh` already exists in PoC. |
| Map style | Programmatic `StyleSpecification` (no external style JSON) | Fully offline — no glyphs, sprites, or external URLs. All styles defined in TypeScript with theme-aware color palettes. |
| Offline storage | `/public/brazil.pmtiles` (served as static asset) | Next.js `public/` directory. Configurable via `NEXT_PUBLIC_PMTILES_URL` env var. |

### Tile Pipeline

```
┌─────────────────────────────────────────────────────┐
│                  Tile Data Pipeline                   │
│                                                       │
│  Protomaps OSM Extract                                │
│  (brazil.pmtiles, ~200MB)                             │
│       │                                               │
│       ▼                                               │
│  scripts/download-tiles.sh                            │
│  • curl/wget from CDN or local source                 │
│  • Checksum verification (SHA256)                     │
│  • Skip if already present (idempotent)               │
│  • Called by: npm run download-tiles                  │
│  • Also called by: postinstall (auto-download)        │
│       │                                               │
│       ▼                                               │
│  apps/hermes-gps-final/public/brazil.pmtiles          │
│       │                                               │
│       ▼                                               │
│  MapLibre GL JS                                       │
│  • pmtiles.Protocol registers pmtiles:// handler      │
│  • Map requests tiles via pmtiles://brazil.pmtiles    │
│  • Protocol reads byte ranges from file via fetch     │
│  • MapLibre renders vector tiles with WebGL           │
│       │                                               │
│       ▼                                               │
│  User sees offline map — no internet required         │
└─────────────────────────────────────────────────────┘
```

### Theme-Aware Map Styles

The PoC already implements dark/light theme styles (`buildStyle(dark)` in `MapView.tsx`). The final version enhances this:

- Extract theme-aware palette to `packages/tailwind-config/src/map-tokens.ts`
- Add more layer types: place labels (city names via Protomaps `places` layer), water labels, road shields
- Use CSS custom properties for colors where possible, falling back to programmatic style generation

### Tile Error Handling

When the PMTiles file is missing (e.g., fresh clone without running `download-tiles`):
- Map renders a blank background with an error overlay
- Overlay shows: "Map tiles unavailable" + file path + `npm run download-tiles` command
- User can still see lat/lon coordinates in the bottom panel
- PoC already implements this pattern — carry forward with i18n support

## Consequences

### Positive
- Fully offline — zero external network requests for map rendering
- Single file deployment — one `.pmtiles` file, no tile server infrastructure
- MapLibre GL JS is actively maintained, has strong mobile support (WebGL on Capacitor WebView)
- Theme-aware styles provide good visual integration with the app's dark/light modes
- Download script is already implemented and tested in PoC
- PMTiles format supports efficient random access (byte-range requests) — no need to download entire file to render a single tile

### Negative
- Brazil PMTiles extract is ~200MB — significant for mobile app download (mitigated: downloaded once, updates incremental)
- MapLibre GL JS bundle is ~200kB gzipped — code-split via `next/dynamic` with `ssr: false` (already done in PoC)
- PMTiles format requires `SharedArrayBuffer` for some operations — may not be available in all Capacitor WebViews (mitigated: fallback to `fetch`-based access)
- No place labels or road names in the PoC style — need to add Protomaps `places` and `roads` label layers

### Mitigations
- `maplibre-gl` imported dynamically: `const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })`
- PMTiles download script uses resume-able downloads and checksum verification
- `NEXT_PUBLIC_PMTILES_URL` allows pointing to a different region or custom tile file
- Map layer configuration is centralized in `packages/tailwind-config/src/map-tokens.ts` for consistency

## Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| Online tile servers (OSM, Mapbox) | Require internet — defeats the purpose for remote HF stations |
| MBTiles format | Requires a tile server or SQLite in browser; PMTiles is more efficient for direct file access |
| Google Maps / Leaflet | Google Maps requires API key and internet; Leaflet requires tile server |
| Offline raster tiles (PNG/WEBP) | Massive file size for multiple zoom levels; vector tiles are far more compact |
| Custom tile server (martin, tegola) | Adds infrastructure complexity; PMTiles file is zero-infrastructure |

## References

- PMTiles specification: `https://github.com/protomaps/PMTiles`
- MapLibre GL JS: `https://maplibre.org/maplibre-gl-js/docs/`
- Protomaps OSM extracts: `https://maps.protomaps.com/`
- PoC implementation: `apps/hermes-gps/src/components/MapView.tsx`
- PoC download script: `apps/hermes-gps/scripts/download-tiles.sh`