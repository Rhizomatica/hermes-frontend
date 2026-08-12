import { NextRequest, NextResponse } from 'next/server';
import { hermesGet } from '@hermes/api';

/**
 * GET /api/sys/uuls
 *
 * Proxies the UUCP/UULS pending-sync list from hermes-backend.
 * Returns entries with `messageId` fields indicating messages still
 * awaiting pickup by the sync daemon.
 *
 * @example
 * GET /api/sys/uuls
 * → 200 { data: [{ messageId: 42, ... }, ...] }
 */
export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') ?? undefined;
    const { data, status } = await hermesGet('/sys/uuls', cookie);
    return NextResponse.json({ data }, { status });
  } catch (error) {
    console.error('[GET /api/sys/uuls]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}