import { NextRequest, NextResponse } from 'next/server';
import { hermesPost, hermesGet } from '@hermes/api';

/**
 * POST /api/auth/login
 *
 * Proxies login credentials to hermes-backend.
 * Sets hermes_token and hermes_refresh Set-Cookie headers on success.
 *
 * Backend expects: { callsign, password } → { access, refresh, user }
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 });
  }

  const callsign = typeof body.callsign === 'string' ? body.callsign : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!callsign.trim()) {
    return NextResponse.json({ message: 'Callsign is required.' }, { status: 400 });
  }
  if (!password.trim()) {
    return NextResponse.json({ message: 'Password is required.' }, { status: 400 });
  }

  const cookie = request.headers.get('cookie') ?? undefined;
  const { data, status } = await hermesPost('/auth/login', { callsign: callsign.trim(), password }, cookie);

  if (status >= 400) return NextResponse.json(data, { status });

  const response = NextResponse.json(data, { status });
  const authData = data as {
    access?: string;
    refresh?: string;
    accessToken?: string;
    refreshToken?: string;
    user?: unknown;
  };
  const access = authData.access ?? authData.accessToken;
  const refresh = authData.refresh ?? authData.refreshToken;
  if (access) {
    response.headers.set('Set-Cookie', `hermes_token=${access}; SameSite=Lax; Path=/; Max-Age=604800`);
  }
  if (refresh) {
    response.headers.append('Set-Cookie', `hermes_refresh=${refresh}; SameSite=Lax; Path=/; Max-Age=2592000`);
  }

  // Backend login returns only tokens — fetch the user profile and persist it
  // as a cookie so the session is shared across dev ports (cookies are
  // host-scoped, unlike localStorage which is port-scoped).
  const user = authData.user ?? (access ? await fetchUserFromBackend(access) : undefined);
  if (user) {
    const userJson = encodeURIComponent(JSON.stringify(user));
    response.headers.append('Set-Cookie', `hermes_user=${userJson}; SameSite=Lax; Path=/; Max-Age=604800`);
  }
  return response;
}

/** Fetch the authenticated user profile from the backend using a bearer token. */
async function fetchUserFromBackend(accessToken: string): Promise<unknown> {
  const authorization = accessToken.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken}`;
  const { data, status } = await hermesGet('/users/me', undefined, authorization);
  if (status >= 400) return undefined;
  return data;
}
