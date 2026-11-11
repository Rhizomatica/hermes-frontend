import { NextRequest, NextResponse } from 'next/server';
import { hermesGet } from '@hermes/api';

/**
 * GET /api/gps/beacon
 *
 * Proxies the station's position-beacon state from hermes-radio-daemon
 * `GET /api/v2/gps/beacon`. Returns the daemon's `Beacon` object unchanged
 * (including the current `emergency` SOS code) or a problem+json error.
 *
 * @example
 * GET /api/gps/beacon
 * → 200 { enabled, interval_s, callsign, emergency, running, … }
 */
export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') ?? undefined;
    const authorization = request.headers.get('authorization') ?? undefined;
    const { data, status } = await hermesGet('/api/v2/gps/beacon', cookie, authorization);

    return NextResponse.json(data, { status });
  } catch (error) {
    console.error('[GET /api/gps/beacon]', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}