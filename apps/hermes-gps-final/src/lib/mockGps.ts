import type { Gps, GpsPoint } from '@hermes/api';

/**
 * Mock GPS fixtures for local development and UI testing.
 *
 * When hermes-radio-daemon is not running, these fixtures let you exercise the
 * GPS page (position panel, breadcrumb trail, status badge, map fly-to)
 * without a live data source.
 *
 * Enable by setting `MOCK_GPS=true` in `apps/hermes-gps-final/.env.local`.
 * The `/api/gps` and `/api/gps/history` routes return these fixtures instead
 * of proxying to the daemon.
 */

/** Fixed position in São Paulo (inside the Brazil PMTiles extract bounds). */
const BASE = {
  latitude: -23.55052,
  longitude: -46.633308,
};

const TRAIL_POINTS = 30;
const STEP_MS = 30_000;

/**
 * A live GPS state matching hermes-radio-daemon's `Gps` schema
 * (`GET /api/v2/gps`).
 */
export function mockGps(): Gps {
  return {
    fix: '3d',
    latitude: BASE.latitude,
    longitude: BASE.longitude,
    altitude_m: 760,
    at: new Date().toISOString(),
    settings: {
      logging: true,
      sample_interval_s: 30,
      file_period_s: 3600,
      email: null,
      report: { enabled: false, interval_s: 900 },
    },
  };
}

/**
 * A breadcrumb trail simulating recent movement toward the base position.
 *
 * Returned oldest-first (index 0 = oldest), matching the ordering of
 * hermes-radio-daemon's `GET /api/v2/gps/trip` (`GpsPoint[]`).
 */
export function mockHistory(): GpsPoint[] {
  const now = Date.now();
  const trail: GpsPoint[] = [];

  for (let i = 0; i < TRAIL_POINTS; i++) {
    const progress = i / (TRAIL_POINTS - 1); // 0 = oldest, 1 = newest
    trail.push({
      at: new Date(now - (TRAIL_POINTS - 1 - i) * STEP_MS).toISOString(),
      latitude: BASE.latitude + 0.024 * progress,
      longitude: BASE.longitude + 0.024 * progress,
      altitude_m: 760 - Math.round(progress * 80),
      accuracy_m: 5,
    });
  }

  return trail;
}