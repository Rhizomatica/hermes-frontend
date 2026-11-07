import type { Gps, GpsFile, GpsPoint, GpsStation, Trip, TripPoints } from '@hermes/api';

/**
 * Mock GPS fixtures for local development and UI testing.
 *
 * When hermes-radio-daemon is not running, these fixtures let you exercise the
 * GPS page (position panel, breadcrumb trail, status badge, map fly-to)
 * without a live data source.
 *
 * Enable by setting `NEXT_PUBLIC_MOCK_GPS=true` in `apps/hermes-gps-final/.env.local`.
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

/** Number of recorded trips in the mock history (plus the open one). */
const TRIP_COUNT = 4;

/** Breadcrumb length of the open mock trip (kept in sync with its point_count). */
const OPEN_TRIP_POINT_COUNT = 30;

/**
 * Static mock trip list, built once so `mockTrips` and `mockTripPoints` share
 * the same identities without calling back into each other.
 */
const TRIPS: Trip[] = (() => {
  const now = Date.now();
  const openAt = now - 2 * 60 * 60 * 1000; // open trip started 2h ago
  const trips: Trip[] = [
    {
      id: 104,
      started_at: new Date(openAt).toISOString(),
      ended_at: null,
      point_count: OPEN_TRIP_POINT_COUNT,
    },
  ];

  for (let i = 1; i < TRIP_COUNT; i++) {
    const startedAt = openAt - i * 26 * 60 * 60 * 1000; // one trip per day
    trips.push({
      id: 104 - i,
      started_at: new Date(startedAt).toISOString(),
      ended_at: new Date(startedAt + 6 * 60 * 60 * 1000).toISOString(),
      point_count: 12 + i * 3,
    });
  }

  return trips;
})();

/**
 * A list of recorded trips for `GET /api/v2/gps/trips`, newest first.
 *
 * The newest trip is always open (`ended_at: null`); older ones are closed so
 * the trips panel can show both states.
 */
export function mockTrips(): Trip[] {
  return TRIPS.map((trip) => ({ ...trip }));
}

/**
 * A single recorded trip and its breadcrumb for `GET /api/v2/gps/trips/{id}`.
 * Returns the same shape whether the trip is open or closed.
 */
export function mockTripPoints(tripId: number): TripPoints {
  const trip = TRIPS.find((t) => t.id === tripId) ?? TRIPS[0];

  const pointCount = trip.point_count ?? OPEN_TRIP_POINT_COUNT;
  const startedAt = new Date(trip.started_at).getTime();
  const endedAt = trip.ended_at ? new Date(trip.ended_at).getTime() : Date.now();
  const duration = Math.max(endedAt - startedAt, 1);
  const points: GpsPoint[] = [];

  for (let i = 0; i < pointCount; i++) {
    const progress = i / Math.max(pointCount - 1, 1);
    points.push({
      at: new Date(startedAt + duration * progress).toISOString(),
      latitude: BASE.latitude + 0.03 * Math.sin(progress * Math.PI * 2),
      longitude: BASE.longitude + 0.03 * Math.cos(progress * Math.PI * 2),
      altitude_m: 760 - Math.round(progress * 120),
      accuracy_m: 5,
    });
  }

  return { trip: { ...trip }, data: points };
}

/**
 * The trip returned by `POST /api/v2/gps/trip/close`: the trip that was just
 * closed (now with an `ended_at` timestamp).
 */
export function mockClosedTrip(): Trip {
  const open = TRIPS.find((t) => t.ended_at == null) ?? TRIPS[0];
  return { ...open, ended_at: new Date().toISOString() };
}

/** Number of mock recorded position files. */
const FILE_COUNT = 4;

/**
 * Static mock file list, built once so `mockGpsFiles` and `mockGpsFileBuffer`
 * share the same identities.
 */
const FILES: GpsFile[] = (() => {
  const now = Date.now();
  return Array.from({ length: FILE_COUNT }, (_, i) => {
    const stamp = new Date(now - i * 3600_000).toISOString().slice(0, 13).replace(/[-:]/g, '');
    return {
      name: `positions-${stamp}.gpx`,
      size_bytes: 12_400 + i * 3_210,
      created_at: new Date(now - i * 3600_000).toISOString(),
    };
  });
})();

/**
 * A list of recorded position files for `GET /api/v2/gps/files`, newest first.
 */
export function mockGpsFiles(): GpsFile[] {
  return FILES.map((file) => ({ ...file }));
}

/**
 * The octet-stream body of a recorded position file for
 * `GET /api/v2/gps/files/{name}`, or null when the name is unknown.
 */
export function mockGpsFileBuffer(name: string): Buffer | null {
  const file = FILES.find((f) => f.name === name);
  if (!file) return null;
  return Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?>\n<gpx><name>${file.name}</name></gpx>\n`,
    'utf8',
  );
}

/**
 * A few known stations for `GET /api/v2/gps/stations`, with last-known
 * positions near the base position. One station has no known position, to
 * exercise the null case the map skips.
 */
export function mockGpsStations(): GpsStation[] {
  const now = Date.now();
  return [
    {
      uucp_name: 'PY2ABC',
      enabled: true,
      latitude: -23.51,
      longitude: -46.6,
      altitude_m: 780,
      position_at: new Date(now - 60_000).toISOString(),
      position_source: 'gps',
    },
    {
      uucp_name: 'PY2DEF',
      enabled: true,
      latitude: -23.6,
      longitude: -46.7,
      altitude_m: 720,
      position_at: new Date(now - 300_000).toISOString(),
      position_source: 'gps',
    },
    {
      uucp_name: 'PY2GHI',
      enabled: true,
      latitude: -23.45,
      longitude: -46.55,
      altitude_m: 800,
      position_at: new Date(now - 900_000).toISOString(),
      position_source: 'manual',
    },
    {
      uucp_name: 'PY2JKL',
      enabled: true,
      latitude: null,
      longitude: null,
      altitude_m: null,
      position_at: null,
      position_source: null,
    },
  ];
}