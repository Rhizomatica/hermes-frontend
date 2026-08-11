import { NextRequest, NextResponse } from 'next/server';
import { hermesPost } from '@hermes/api';

/**
 * POST /api/auth/refresh
 *
 * Refreshes the access token using the refresh token.
 * Sets new hermes_token and hermes_refresh cookies on success.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 });
  }

  const refresh = body.refresh;
  if (typeof refresh !== 'string' || !refresh.trim()) {
    return NextResponse.json({ message: 'Refresh token is required.' }, { status: 400 });
  }

  const cookie = request.headers.get('cookie') ?? undefined;
  const { data, status } = await hermesPost('auth/refresh', { refresh: refresh.trim() }, cookie);

  if (status >= 400) return NextResponse.json(data, { status });

  const response = NextResponse.json(data, { status });
  const authData = data as { access?: string; refresh?: string };
  if (authData.access) {
    response.headers.set('Set-Cookie', `hermes_token=${authData.access}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`);
  }
  if (authData.refresh) {
    response.headers.append('Set-Cookie', `hermes_refresh=${authData.refresh}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`);
  }
  return response;
}