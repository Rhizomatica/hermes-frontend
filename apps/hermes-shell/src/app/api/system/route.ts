import { NextRequest, NextResponse } from 'next/server';
import { hermesGet } from '@hermes/api';

/**
 * GET /api/system
 *
 * Proxies the station's identity from hermes-radio-daemon
 * `GET /api/v2/system`. Returns the daemon's `System` object unchanged
 * (station name, callsign, domain, versions, uptime, …) or a problem+json
 * error.
 *
 * @example
 * GET /api/system
 * → 200 { hostname, uucp_name, callsign, domain, versions, uptime_s, … }
 */
export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') ?? undefined;
    const authorization = request.headers.get('authorization') ?? undefined;
    const { data, status } = await hermesGet('/api/v2/system', cookie, authorization);
    return NextResponse.json(data, { status });
  } catch (error) {
    console.error('[GET /api/system]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
