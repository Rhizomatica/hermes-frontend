import { NextRequest, NextResponse } from 'next/server';
import { hermesGet } from '@hermes/api';
import type { Station } from '@hermes/api';

/**
 * GET /api/stations
 *
 * Proxies the known-station list from hermes-backend.
 *
 * @example
 * GET /api/stations
 * → 200 { data: Station[] }
 */
export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') ?? undefined;
    const { data, status } = await hermesGet('/stations', cookie);
    if (status >= 400) {
      return NextResponse.json(data, { status });
    }
    const stations: Station[] = Array.isArray(data) ? (data as Station[]) : [];
    return NextResponse.json({ data: stations }, { status });
  } catch (error) {
    console.error('[GET /api/stations]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}