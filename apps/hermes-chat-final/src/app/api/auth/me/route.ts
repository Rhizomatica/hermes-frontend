import { NextRequest, NextResponse } from 'next/server';
import { hermesGet } from '@hermes/api';

/**
 * GET /api/auth/me
 *
 * Validates the current session via the shared host-scoped HttpOnly cookie.
 * AuthProvider (Option A) relies on this route — each standalone app must
 * expose it so it can resolve identity without reading the token client-side.
 */
export async function GET(request: NextRequest) {
  const cookie = request.headers.get('cookie') ?? undefined;
  const authorization = request.headers.get('authorization') ?? undefined;
  const { data, status } = await hermesGet('/users/me', cookie, authorization);
  return NextResponse.json(data, { status });
}