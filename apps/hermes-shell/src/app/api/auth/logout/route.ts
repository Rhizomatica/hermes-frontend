import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 *
 * Clears the HttpOnly hermes_token/hermes_refresh cookies and the
 * client-readable hermes_user cookie. The backend refresh token is left to
 * expire naturally; local session state is cleared on the client regardless.
 *
 * No backend call is required — logout is a local cookie-clearing operation.
 */
export async function POST(_request: NextRequest) {
  const response = NextResponse.json({ ok: true });

  const expire = 'Path=/; Max-Age=0';
  for (const name of ['hermes_token', 'hermes_refresh', 'hermes_user']) {
    // HttpOnly attribute is irrelevant for deletion but kept consistent.
    response.headers.append('Set-Cookie', `${name}=; ${expire}; HttpOnly; SameSite=Lax`);
  }

  return response;
}