import { NextRequest, NextResponse } from 'next/server';
import { hermesGet } from '@hermes/api';
import { mockHistory } from '@/lib/mockGps';

/**
 * GET /api/gps/history
 *
 * Proxies GPS position history from hermes-backend.
 * Returns an array of GpsPosition objects ordered by timestamp descending.
 * Limited to 500 most recent points.
 *
 * @example
 * GET /api/gps/history
 * → 200 { data: [{ latitude, longitude, altitude, speed, heading, timestamp }, ...] }
 */
export async function GET(request: NextRequest) {
  try {
    if (process.env.MOCK_GPS === 'true') {
      return NextResponse.json({ data: mockHistory() }, { status: 200 });
    }

    const cookie = request.headers.get('cookie') ?? undefined;
    const { data, status } = await hermesGet('gps/history', cookie);

    if (status >= 400) {
      return NextResponse.json(data, { status });
    }

    // Ensure we return an array, limited to 500 points
    const history = Array.isArray(data) ? data.slice(0, 500) : [];

    return NextResponse.json({ data: history }, { status });
  } catch (error) {
    console.error('[GET /api/gps/history]', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}