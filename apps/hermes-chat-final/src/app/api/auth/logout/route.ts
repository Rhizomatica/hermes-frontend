import { NextRequest, NextResponse } from 'next/server';
import { hermesDelete } from '@hermes/api';

/**
 * POST /api/auth/logout
 *
 * Ends the session on the station API (DELETE /api/v2/session) and clears the
 * HttpOnly hermes_session cookie plus the client-readable hermes_user cookie.
 * Local session state is cleared on the client regardless of the backend call.
 */
export async function POST(request: NextRequest) {
  const cookie = request.headers.get('cookie') ?? undefined;

  // Best-effort: a failure here still logs the local session out.
  if (cookie) {
    await hermesDelete('/api/v2/session', cookie);
  }

  const response = NextResponse.json({ ok: true });
  const expire = 'Path=/; Max-Age=0';
  for (const name of ['hermes_session', 'hermes_user']) {
    response.headers.append('Set-Cookie', `${name}=; ${expire}; HttpOnly; SameSite=Strict`);
  }

  return response;
}
