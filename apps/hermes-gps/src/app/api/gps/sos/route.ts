import { NextRequest, NextResponse } from 'next/server';
import { hermesDelete, hermesPost } from '@hermes/api';

/**
 * POST /api/gps/sos
 *
 * Sets the station's emergency (SOS) code via hermes-radio-daemon
 * `POST /api/v2/gps/sos`. The daemon beacons the code at the emergency
 * interval until it is cleared. Body: `{ code?: 1..30 }` (default 1 =
 * distress, unspecified).
 *
 * @example
 * POST /api/gps/sos  body: { code: 1 }
 * → 202 { enabled, interval_s, callsign, emergency: 1, … }
 */
export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') ?? undefined;
    const authorization = request.headers.get('authorization') ?? undefined;
    const body = (await request.json().catch(() => ({}))) as { code?: number };

    const { data, status } = await hermesPost(
      '/api/v2/gps/sos',
      body,
      cookie,
      authorization,
    );

    return NextResponse.json(data, { status });
  } catch (error) {
    console.error('[POST /api/gps/sos]', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/gps/sos
 *
 * Clears the emergency code via hermes-radio-daemon `DELETE /api/v2/gps/sos`;
 * the daemon broadcasts one "emergency over" (code 31) beacon.
 *
 * @example
 * DELETE /api/gps/sos
 * → 200 { enabled, interval_s, callsign, emergency: 0, … }
 */
export async function DELETE(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') ?? undefined;
    const authorization = request.headers.get('authorization') ?? undefined;
    const { data, status } = await hermesDelete('/api/v2/gps/sos', cookie, authorization);

    return NextResponse.json(data, { status });
  } catch (error) {
    console.error('[DELETE /api/gps/sos]', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}