import { NextRequest, NextResponse } from 'next/server';
import { hermesGet } from '@hermes/api';

/**
 * GET /api/gps
 *
 * Proxies GPS coordinates from hermes-backend.
 * Returns a GpsPosition object or structured error.
 *
 * @example
 * GET /api/gps
 * → 200 { data: { latitude, longitude, altitude, speed, heading, timestamp } }
 */
export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') ?? undefined;
    const { data, status } = await hermesGet('gps', cookie);

    if (status >= 400) {
      return NextResponse.json(data, { status });
    }

    return NextResponse.json({ data }, { status });
  } catch (error) {
    console.error('[GET /api/gps]', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}