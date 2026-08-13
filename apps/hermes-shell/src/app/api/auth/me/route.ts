import { NextRequest, NextResponse } from 'next/server';
import { hermesGet } from '@hermes/api';

/**
 * GET /api/auth/me
 *
 * Validates current session via hermes-backend.
 * Backend endpoint: GET /users/me (requires Authorization header or cookie).
 * Expects hermes_token cookie forwarded via Authorization header.
 */
export async function GET(request: NextRequest) {
  const cookie = request.headers.get('cookie') ?? undefined;
  const authorization = request.headers.get('authorization') ?? undefined;
  const { data, status } = await hermesGet('/users/me', cookie, authorization);
  return NextResponse.json(data, { status });
}
