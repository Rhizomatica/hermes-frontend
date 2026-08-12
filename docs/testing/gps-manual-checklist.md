# GPS Application — Manual Testing Checklist

**App**: hermes-gps-final  
**URL**: `http://localhost:4001`  
**Target Device**: sBitx (800×480) and Desktop (≥1024px)

---

## Pre-test Setup

- [ ] `npm run build` passes with zero errors
- [ ] `npm run typecheck` passes
- [ ] Backend services running (hermes-backend on :8080, hermes-radio-daemon WebSocket on :8081)
- [ ] PMTiles file exists at `apps/hermes-gps-final/public/brazil.pmtiles` (or run `npm run download-tiles`)

---

## 1. Page Load & Auth

| # | Check | Expected | Status |
|---|---|---|---|
| 1.1 | Navigate to `http://localhost:4001` | Page loads without crash | ☐ |
| 1.2 | Authenticated session | Map renders with coordinate overlay | ☐ |
| 1.3 | Unauthenticated session | Redirected to login or shows auth guard spinner | ☐ |
| 1.4 | "← Back to HERMES" link visible | Links to root `/` | ☐ |

## 2. Map Rendering

| # | Check | Expected | Status |
|---|---|---|---|
| 2.1 | Map container visible | Maplibre GL map fills viewport | ☐ |
| 2.2 | Navigation controls visible | Zoom +/- buttons in top-right | ☐ |
| 2.3 | Scale control visible | Metric scale bar at bottom-left | ☐ |
| 2.4 | PMTiles loaded | Map tiles render (not blank) | ☐ |
| 2.5 | PMTiles missing | "Map tiles not found" error overlay appears | ☐ |
| 2.6 | Light theme mode | Map uses light style | ☐ |
| 2.7 | Dark theme mode | Map uses dark style | ☐ |
| 2.8 | Resize window | Map resizes to fill container | ☐ |

## 3. GPS Position & Marker

| # | Check | Expected | Status |
|---|---|---|---|
| 3.1 | Position available | Orange marker appears at GPS coordinates | ☐ |
| 3.2 | Marker moves with new position | Smooth fly-to animation (1.5s) on coordinate change | ☐ |
| 3.3 | Heading rotation | Arrow rotates to match heading value | ☐ |
| 3.4 | Accuracy circle | Dashed circle scales with HDOP | ☐ |
| 3.5 | Pulsing glow | Outer ring animates (pulse) | ☐ |
| 3.6 | No position data | "Waiting for GPS position…" shown | ☐ |

## 4. Coordinate Panel

| # | Check | Expected | Status |
|---|---|---|---|
| 4.1 | Latitude displayed | Decimal format (6 digits) | ☐ |
| 4.2 | Longitude displayed | Decimal format (6 digits) | ☐ |
| 4.3 | Altitude displayed | Meters (integer) | ☐ |
| 4.4 | Speed displayed | km/h (1 decimal) | ☐ |
| 4.5 | Last updated timestamp | Time displayed in HH:MM:SS format | ☐ |
| 4.6 | Stale indicator | Orange "Stale" badge when >60s without update | ☐ |

## 5. GPS Status Badges

| # | Check | Expected | Status |
|---|---|---|---|
| 5.1 | No Fix | Red badge with "No Fix" | ☐ |
| 5.2 | 2D Fix | Yellow badge with "2D Fix" | ☐ |
| 5.3 | 3D Fix | Green badge with "3D Fix" | ☐ |
| 5.4 | Satellite count | Blue badge with 🛰 icon and count | ☐ |
| 5.5 | HDOP indicator | Color-coded: green (≤1.0), yellow (≤2.0), red (>2.0) | ☐ |
| 5.6 | Tooltips on hover | Satellites and HDOP show descriptive tooltips | ☐ |

## 6. Copy to Clipboard

| # | Check | Expected | Status |
|---|---|---|---|
| 6.1 | Tap/click latitude | "Lat copied!" toast appears for 2s then fades | ☐ |
| 6.2 | Tap/click longitude | "Lon copied!" toast appears for 2s then fades | ☐ |
| 6.3 | Pasted value | Pasted coordinate matches displayed value to 6 decimal places | ☐ |
| 6.4 | Accessibility | aria-live region announces copy event | ☐ |

## 7. Breadcrumb Trail

| # | Check | Expected | Status |
|---|---|---|---|
| 7.1 | Trail toggle off by default | No polyline visible | ☐ |
| 7.2 | Toggle ON | Orange gradient polyline appears on map | ☐ |
| 7.3 | Trail updates with position | New positions extend the polyline | ☐ |
| 7.4 | Toggle OFF | Polyline removed from map | ☐ |
| 7.5 | Toggle button text | Shows "Trail ON" / "Trail OFF" with point count | ☐ |

## 8. Offline Cache

| # | Check | Expected | Status |
|---|---|---|---|
| 8.1 | Disconnect backend | "⚠ Last known position" badge appears | ☐ |
| 8.2 | Cache age displayed | Shows approximate age (e.g., "5m", "1h") | ☐ |
| 8.3 | Reconnect backend | Live data resumes, cache badge disappears | ☐ |
| 8.4 | Logout clears cache | localStorage `hermes_gps_cache` key removed | ☐ |

## 9. Error & Edge Cases

| # | Check | Expected | Status |
|---|---|---|---|
| 9.1 | Backend returns 500 | ErrorBanner appears with retry action | ☐ |
| 9.2 | Backend unavailable | Falls back to cached position, then shows error | ☐ |
| 9.3 | WebSocket disconnected | REST polling fallback every 30s | ☐ |
| 9.4 | WebSocket reconnects | Resumes live updates, stops polling | ☐ |
| 9.5 | Empty/null altitude | Shows "—" dash | ☐ |
| 9.6 | Empty/null speed | Shows "—" dash | ☐ |

## 10. Responsive Design

| # | Check | Expected | Status |
|---|---|---|---|
| 10.1 | sBitx viewport (800×480) | Map + panel fit without horizontal scroll | ☐ |
| 10.2 | Desktop (≥1024px) | Map + panel proportional, no clipping | ☐ |
| 10.3 | Touch targets | All buttons ≥44×44px (WCAG touch target) | ☐ |

## 11. Internationalization

| # | Check | Expected | Status |
|---|---|---|---|
| 11.1 | English locale | All strings in English | ☐ |
| 11.2 | Portuguese locale | All strings in Portuguese (alternar tema/mudar idioma) | ☐ |
| 11.3 | Locale persists | After page reload, selected locale is maintained | ☐ |
| 11.4 | Numbers format locale-aware | Timestamps follow locale format | ☐ |

## 12. Accessibility

| # | Check | Expected | Status |
|---|---|---|---|
| 12.1 | Keyboard navigation | All controls focusable via Tab | ☐ |
| 12.2 | Focus indicators visible | Outline/ring visible on focused elements | ☐ |
| 12.3 | ARIA labels on icon buttons | Screen reader announces button purpose | ☐ |
| 12.4 | Status regions | `role="status"` and `aria-live` for dynamic updates | ☐ |
| 12.5 | Color contrast | Text meets 4.5:1 ratio on all backgrounds | ☐ |

---

**Tester**: ___________  
**Date**: ___________  
**Environment**: ___________ (sBitx / Desktop / Tablet)  
**Browser**: ___________ (Chromium / Firefox)  
**Backend Version**: ___________

## Summary

- Total checks: 54
- Passed: ___ / 54
- Failed: ___ / 54
- Blocked: ___ / 54

## Notes