import { NextRequest, NextResponse } from 'next/server';
import { hermesGet } from '@hermes/api';

/**
 * GET /api/sys
 *
 * Proxies system status from hermes-backend.
 * Returns nodename, domain, version, uptime, and related info.
 *
 * @example
 * GET /api/sys
 * → 200 { data: { nodename, domain, version, uptime, ... } }
 */
export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') ?? undefined;
    const { data, status } = await hermesGet('/sys/status', cookie);
    return NextResponse.json({ data }, { status });
  } catch (error) {
    console.error('[GET /api/sys]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}