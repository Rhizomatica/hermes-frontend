import { NextRequest, NextResponse } from 'next/server';
import { hermesPost, hermesGet } from '@hermes/api';

/**
 * POST /api/auth/refresh
 *
 * Refreshes the access token using the refresh token.
 * Backend expects: { refreshToken } → { access, refresh }
 * Sets new hermes_token and hermes_refresh cookies on success.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 });
  }

  const refreshToken = typeof body.refresh === 'string' ? body.refresh : '';
  if (!refreshToken.trim()) {
    return NextResponse.json({ message: 'Refresh token is required.' }, { status: 400 });
  }

  const cookie = request.headers.get('cookie') ?? undefined;
  const { data, status } = await hermesPost('/auth/refresh', { refreshToken: refreshToken.trim() }, cookie);

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
    response.headers.set(
      'Set-Cookie',
      `hermes_token=${access}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`,
    );
  }
  if (refresh) {
    response.headers.append(
      'Set-Cookie',
      `hermes_refresh=${refresh}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`,
    );
  }
  // Persist a display-only user projection (no role/status) for offline grace.
  const user = authData.user ?? (access ? await fetchUserFromBackend(access) : undefined);
  const cached = user ? toCachedUser(user) : null;
  if (cached) {
    const userJson = encodeURIComponent(JSON.stringify(cached));
    response.headers.append('Set-Cookie', `hermes_user=${userJson}; SameSite=Lax; Path=/; Max-Age=604800`);
  }
  return response;
}

/** Strip authorization claims (role, status) before writing the client cookie. */
function toCachedUser(user: unknown): Record<string, unknown> | null {
  if (!user || typeof user !== 'object') return null;
  const u = user as Record<string, unknown>;
  return {
    id: u.id ?? null,
    callsign: u.callsign ?? null,
    displayName: u.displayName ?? null,
    email: u.email ?? null,
    locale: u.locale ?? null,
    avatarPath: u.avatarPath ?? null,
  };
}

/** Fetch the authenticated user profile from the backend using a bearer token. */
async function fetchUserFromBackend(accessToken: string): Promise<unknown> {
  const authorization = accessToken.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken}`;
  const { data, status } = await hermesGet('/users/me', undefined, authorization);
  if (status >= 400) return undefined;
  return data;
}
