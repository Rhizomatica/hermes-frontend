import { NextRequest, NextResponse } from 'next/server';
import { hermesDelete, hermesGet } from '@hermes/api';
import { mockGpsFiles } from '@/lib/mockGps';

/**
 * GET /api/gps/files
 *
 * Proxies the station's recorded position files from hermes-radio-daemon
 * `GET /api/v2/gps/files` (newest first). Returns the daemon's `GpsFile[]`
 * wrapped as `{ data: [...] }`, unchanged.
 *
 * @example
 * GET /api/gps/files
 * → 200 { data: [{ name, size_bytes, created_at }, ...] }
 */
export async function GET(request: NextRequest) {
  try {
    if (process.env.NEXT_PUBLIC_MOCK_GPS === 'true') {
      return NextResponse.json({ data: mockGpsFiles() }, { status: 200 });
    }

    const cookie = request.headers.get('cookie') ?? undefined;
    const authorization = request.headers.get('authorization') ?? undefined;

    const { data, status } = await hermesGet(
      '/api/v2/gps/files',
      cookie,
      authorization,
    );

    // The daemon has not implemented this endpoint yet, so it answers 404
    // until it lands; degrade to an empty list so the panel renders instead of
    // surfacing a not-found error.
    if (status === 404) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    return NextResponse.json(data, { status });
  } catch (error) {
    console.error('[GET /api/gps/files]', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/gps/files
 *
 * Deletes every recorded position file and cancels their queued transfers via
 * hermes-radio-daemon `DELETE /api/v2/gps/files` (operator role).
 *
 * @example
 * DELETE /api/gps/files
 * → 204 (empty body)
 */
export async function DELETE(request: NextRequest) {
  try {
    if (process.env.NEXT_PUBLIC_MOCK_GPS === 'true') {
      return new NextResponse(null, { status: 204 });
    }

    const cookie = request.headers.get('cookie') ?? undefined;
    const authorization = request.headers.get('authorization') ?? undefined;

    const { data, status } = await hermesDelete(
      '/api/v2/gps/files',
      cookie,
      authorization,
    );

    if (status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json(data, { status });
  } catch (error) {
    console.error('[DELETE /api/gps/files]', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
