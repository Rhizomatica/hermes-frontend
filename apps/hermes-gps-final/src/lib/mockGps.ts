import type { GpsPosition, GpsFix } from '@hermes/api';

/**
 * Mock GPS fixtures for local development and UI testing.
 *
 * When hermes-backend and hermes-radio-daemon are not running, these fixtures
 * let you exercise the GPS page (position panel, breadcrumb trail, status
 * badge, map fly-to) without a live data source.
 *
 * Enable by setting `MOCK_GPS=true` in `apps/hermes-gps-final/.env.local`.
 * The `/api/gps` and `/api/gps/history` routes return these fixtures instead
 * of proxying to the backend.
 */

/** Fixed position in São Paulo (inside the Brazil PMTiles extract bounds). */
const BASE = {
  latitude: -23.55052,
  longitude: -46.633308,
};

const TRAIL_POINTS = 30;
const STEP_MS = 30_000;

/**
 * A single live GPS position stamped at the current time.
 * Matches the `GpsPosition` shape consumed by `useGpsCoords`.
 */
export function mockPosition(): GpsPosition {
  return {
    latitude: BASE.latitude,
    longitude: BASE.longitude,
    altitude: 760,
    speed: 42.5,
    heading: 180,
    timestamp: new Date().toISOString(),
  };
}

/** A mock GPS fix-quality report (matches the `GpsFix` shape). */
export function mockFix(): GpsFix {
  return {
    quality: 2,
    satellites: 11,
    hdop: 1.2,
  };
}

/**
 * A breadcrumb trail simulating recent movement toward the base position.
 *
 * Returned newest-first (index 0 = most recent), matching the ordering the
 * `/api/gps/history` route contract expects; `useGpsHistory` reverses it into
 * oldest-first for the trail.
 */
export function mockHistory(): GpsPosition[] {
  const now = Date.now();
  const trail: GpsPosition[] = [];

  for (let i = 0; i < TRAIL_POINTS; i++) {
    const progress = i / (TRAIL_POINTS - 1); // 0 = newest, 1 = oldest
    trail.push({
      latitude: BASE.latitude + 0.024 * progress,
      longitude: BASE.longitude + 0.024 * progress,
      altitude: 760 - Math.round(progress * 80),
      speed: Math.round(42 - progress * 22),
      heading: 45,
      timestamp: new Date(now - i * STEP_MS).toISOString(),
    });
  }

  return trail;
}