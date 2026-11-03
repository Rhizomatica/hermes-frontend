import { NextRequest, NextResponse } from 'next/server';
import { hermesGet, type GpsPoint } from '@hermes/api';
import { mockHistory } from '@/lib/mockGps';

/**
 * GET /api/gps/history
 *
 * Proxies the station's breadcrumb trail from hermes-radio-daemon
 * `GET /api/v2/gps/trip` (the current trip's `GpsPoint[]`, oldest-first).
 *
 * The daemon has not implemented this endpoint yet, so it answers 404 until
 * it lands; this proxy degrades to an empty trail so the client can still
 * build one from live `gps` WebSocket events.
 *
 * @example
 * GET /api/gps/history
 * → 200 { data: [{ at, latitude, longitude, altitude_m }, ...] }
 */
export async function GET(request: NextRequest) {
  try {
    if (process.env.MOCK_GPS === 'true') {
      return NextResponse.json({ data: mockHistory() }, { status: 200 });
    }

    const cookie = request.headers.get('cookie') ?? undefined;
    const { data, status } = await hermesGet('/api/v2/gps/trip', cookie);

    if (status === 404) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }
    if (status >= 400) {
      return NextResponse.json(data, { status });
    }

    const trip = (data ?? {}) as { data?: GpsPoint[] };
    const points = Array.isArray(trip.data) ? trip.data.slice(0, 500) : [];

    return NextResponse.json({ data: points }, { status });
  } catch (error) {
    console.error('[GET /api/gps/history]', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}