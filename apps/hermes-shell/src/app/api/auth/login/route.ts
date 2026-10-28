import { NextRequest, NextResponse } from 'next/server';
import { hermesPost } from '@hermes/api';

/**
 * POST /api/auth/login
 *
 * Proxies login credentials to the station API (hermes-radio-daemon).
 * Sets the hermes_session cookie on success.
 *
 * Backend: POST /api/v2/session  { username, password }
 *        → 201 { user, token, expires_at } + Set-Cookie: hermes_session
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 });
  }

  const username = typeof body.username === 'string' ? body.username : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!username.trim()) {
    return NextResponse.json({ message: 'Username is required.' }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ message: 'Password is required.' }, { status: 400 });
  }

  const cookie = request.headers.get('cookie') ?? undefined;
  const { data, status } = await hermesPost('/api/v2/session', { username: username.trim(), password }, cookie);

  if (status >= 400) return NextResponse.json(data, { status });

  const session = data as { user?: unknown; token?: string; expires_at?: string };

  // Return the authenticated user; AuthProvider re-validates via /api/auth/me.
  const response = NextResponse.json(session.user ?? {});

  if (session.token) {
    // HttpOnly: the client must not read the token from JavaScript (ADR-003).
    response.headers.set(
      'Set-Cookie',
      `hermes_session=${session.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800`,
    );
  }

  // Persist a DISPLAY-ONLY user projection (no role/disabled authorization
  // claims) to a client-readable cookie for offline grace and cross-port
  // sharing in dev. Authoritative identity is always served by /api/auth/me.
  const cached = session.user ? toCachedUser(session.user) : null;
  if (cached) {
    const userJson = encodeURIComponent(JSON.stringify(cached));
    response.headers.append('Set-Cookie', `hermes_user=${userJson}; SameSite=Lax; Path=/; Max-Age=604800`);
  }
  return response;
}

/**
 * Strip authorization claims (role, disabled) and unknown fields before
 * writing the user to the client-readable cookie (see F3).
 */
function toCachedUser(user: unknown): Record<string, unknown> | null {
  if (!user || typeof user !== 'object') return null;
  const u = user as Record<string, unknown>;
  return {
    id: u.id ?? null,
    username: u.username ?? null,
    display_name: u.display_name ?? null,
    locale: u.locale ?? null,
    avatar: u.avatar ?? null,
  };
}
