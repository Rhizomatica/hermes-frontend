import { NextRequest, NextResponse } from 'next/server';
import { hermesPatch } from '@hermes/api';

/**
 * PATCH /api/gps/settings
 *
 * Proxies GPS logging settings to hermes-radio-daemon
 * `PATCH /api/v2/gps/settings` (operator role). The request body is the
 * partial `GpsSettings` object; the daemon returns the applied settings.
 *
 * @example
 * PATCH /api/gps/settings
 * body: { logging: false }
 * → 200 { logging, sample_interval_s, file_period_s, email }
 */
export async function PATCH(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') ?? undefined;
    const authorization = request.headers.get('authorization') ?? undefined;
    const body = await request.json();

    const { data, status } = await hermesPatch(
      '/api/v2/gps/settings',
      body,
      cookie,
      authorization,
    );

    return NextResponse.json(data, { status });
  } catch (error) {
    console.error('[PATCH /api/gps/settings]', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
