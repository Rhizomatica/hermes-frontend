import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 *
 * Clears the shared HttpOnly hermes_token/hermes_refresh cookies and the
 * client-readable hermes_user cookie. HttpOnly tokens cannot be cleared from
 * JavaScript, so each standalone app must expose this route.
 */
export async function POST(_request: NextRequest) {
  const response = NextResponse.json({ ok: true });

  const expire = 'Path=/; Max-Age=0';
  for (const name of ['hermes_token', 'hermes_refresh', 'hermes_user']) {
    response.headers.append('Set-Cookie', `${name}=; ${expire}; HttpOnly; SameSite=Lax`);
  }

  return response;
}