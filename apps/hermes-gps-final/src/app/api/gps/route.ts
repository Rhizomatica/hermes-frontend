import { NextRequest, NextResponse } from 'next/server';
import { hermesGet } from '@hermes/api';
import { mockGps } from '@/lib/mockGps';

/**
 * GET /api/gps
 *
 * Proxies the station's position, fix and logging settings from
 * hermes-radio-daemon `GET /api/v2/gps`. Returns the daemon's `Gps` object
 * (or a problem+json error) unchanged.
 *
 * @example
 * GET /api/gps
 * → 200 { fix, latitude, longitude, altitude_m, at, settings }
 */
export async function GET(request: NextRequest) {
  try {
    if (process.env.MOCK_GPS === 'true') {
      return NextResponse.json(mockGps(), { status: 200 });
    }

    const cookie = request.headers.get('cookie') ?? undefined;
    const { data, status } = await hermesGet('/api/v2/gps', cookie);

    return NextResponse.json(data, { status });
  } catch (error) {
    console.error('[GET /api/gps]', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}