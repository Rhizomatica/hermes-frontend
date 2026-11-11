import { NextRequest, NextResponse } from 'next/server';
import { hermesPost } from '@hermes/api';
import { mockClosedTrip } from '@/lib/mockGps';

/**
 * POST /api/gps/trip/close
 *
 * Closes the station's open trip via hermes-radio-daemon
 * `POST /api/v2/gps/trip/close` (operator role). The daemon sets `ended_at` on
 * the open trip and starts a new one; the closed trip is returned unchanged
 * from history.
 *
 * @example
 * POST /api/gps/trip/close
 * → 200 { id, started_at, ended_at, point_count }
 */
export async function POST(request: NextRequest) {
  try {
    if (process.env.NEXT_PUBLIC_MOCK_GPS === 'true') {
      return NextResponse.json(mockClosedTrip(), { status: 200 });
    }

    const cookie = request.headers.get('cookie') ?? undefined;
    const authorization = request.headers.get('authorization') ?? undefined;

    const { data, status } = await hermesPost(
      '/api/v2/gps/trip/close',
      {},
      cookie,
      authorization,
    );

    return NextResponse.json(data, { status });
  } catch (error) {
    console.error('[POST /api/gps/trip/close]', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}