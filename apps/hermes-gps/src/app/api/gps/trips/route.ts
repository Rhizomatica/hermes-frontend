import { NextRequest, NextResponse } from 'next/server';
import { hermesGet } from '@hermes/api';
import { mockTrips } from '@/lib/mockGps';

/**
 * GET /api/gps/trips
 *
 * Proxies the station's recorded trips from hermes-radio-daemon
 * `GET /api/v2/gps/trips` (newest first). Accepts the daemon's `limit` and
 * `cursor` query parameters and passes them through for pagination.
 *
 * @example
 * GET /api/gps/trips?limit=25
 * → 200 { data: [{ id, started_at, ended_at, point_count }], next_cursor? }
 */
export async function GET(request: NextRequest) {
  try {
    if (process.env.NEXT_PUBLIC_MOCK_GPS === 'true') {
      return NextResponse.json({ data: mockTrips() }, { status: 200 });
    }

    const cookie = request.headers.get('cookie') ?? undefined;
    const authorization = request.headers.get('authorization') ?? undefined;

    const query = new URLSearchParams();
    const limit = request.nextUrl.searchParams.get('limit');
    const cursor = request.nextUrl.searchParams.get('cursor');
    if (limit) query.set('limit', limit);
    if (cursor) query.set('cursor', cursor);
    const qs = query.toString();

    const { data, status } = await hermesGet(
      `/api/v2/gps/trips${qs ? `?${qs}` : ''}`,
      cookie,
      authorization,
    );

    // The daemon has not implemented this endpoint yet, so it answers 404
    // until it lands; degrade to an empty list so the trips panel renders
    // instead of surfacing a not-found error.
    if (status === 404) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    return NextResponse.json(data, { status });
  } catch (error) {
    console.error('[GET /api/gps/trips]', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}