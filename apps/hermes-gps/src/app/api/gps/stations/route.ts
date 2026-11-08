import { NextRequest, NextResponse } from 'next/server';
import { hermesGet } from '@hermes/api';
import { mockGpsStations } from '@/lib/mockGps';

/**
 * GET /api/gps/stations
 *
 * Proxies every known station and its last-known position from
 * hermes-radio-daemon `GET /api/v2/gps/stations` (the UUCP stations, with the
 * position from their last position beacon). Stations with no known position
 * are still listed with null position fields.
 *
 * @example
 * GET /api/gps/stations
 * → 200 { data: [{ uucp_name, enabled, latitude, longitude, position_at, … }] }
 */
export async function GET(request: NextRequest) {
  try {
    if (process.env.NEXT_PUBLIC_MOCK_GPS === 'true') {
      return NextResponse.json({ data: mockGpsStations() }, { status: 200 });
    }

    const cookie = request.headers.get('cookie') ?? undefined;
    const authorization = request.headers.get('authorization') ?? undefined;

    const { data, status } = await hermesGet(
      '/api/v2/gps/stations',
      cookie,
      authorization,
    );

    // Degrade to an empty list when the daemon does not implement the endpoint.
    if (status === 404) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    return NextResponse.json(data, { status });
  } catch (error) {
    console.error('[GET /api/gps/stations]', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
