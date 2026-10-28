import { NextRequest, NextResponse } from 'next/server';
import { hermesGet } from '@hermes/api';

/**
 * GET /api/auth/me
 *
 * Validates the current session via the station API (hermes-radio-daemon).
 * Backend endpoint: GET /api/v2/session (returns { user, expires_at }).
 * Expects the hermes_session cookie forwarded via Authorization header.
 */
export async function GET(request: NextRequest) {
  const cookie = request.headers.get('cookie') ?? undefined;
  const authorization = request.headers.get('authorization') ?? undefined;
  const { data, status } = await hermesGet('/api/v2/session', cookie, authorization);
  if (status >= 400) return NextResponse.json(data, { status });
  const user = (data as { user?: unknown }).user ?? data;
  return NextResponse.json(user);
}
