import { NextRequest, NextResponse } from 'next/server';
import { hermesGet } from '@hermes/api';

/**
 * GET /api/auth/me
 *
 * Validates current session via hermes-backend.
 * Expects hermes_token cookie forwarded automatically.
 */
export async function GET(request: NextRequest) {
  const cookie = request.headers.get('cookie') ?? undefined;
  const { data, status } = await hermesGet('auth/me', cookie);
  return NextResponse.json(data, { status });
}