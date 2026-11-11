import { NextRequest, NextResponse } from 'next/server';
import { hermesGet } from '@hermes/api';
import { mockTripPoints } from '@/lib/mockGps';

/**
 * GET /api/gps/trips/[tripId]
 *
 * Proxies one recorded trip and its breadcrumb points from hermes-radio-daemon
 * `GET /api/v2/gps/trips/{trip_id}` (the `Trip` plus its `GpsPoint[]`,
 * oldest-first).
 *
 * @example
 * GET /api/gps/trips/104
 * → 200 { trip: { id, started_at, ended_at, point_count }, data: GpsPoint[] }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const { tripId } = await params;

  try {
    if (!/^\d+$/.test(tripId)) {
      return NextResponse.json(
        { message: 'Invalid trip id.' },
        { status: 400 },
      );
    }

    if (process.env.NEXT_PUBLIC_MOCK_GPS === 'true') {
      return NextResponse.json(mockTripPoints(Number(tripId)), { status: 200 });
    }

    const cookie = request.headers.get('cookie') ?? undefined;
    const authorization = request.headers.get('authorization') ?? undefined;

    const { data, status } = await hermesGet(
      `/api/v2/gps/trips/${tripId}`,
      cookie,
      authorization,
    );

    return NextResponse.json(data, { status });
  } catch (error) {
    console.error(`[GET /api/gps/trips/${tripId}]`, error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}