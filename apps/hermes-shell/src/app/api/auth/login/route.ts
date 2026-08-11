import { NextRequest, NextResponse } from 'next/server';
import { hermesPost } from '@hermes/api';

/**
 * POST /api/auth/login
 *
 * Proxies login credentials to hermes-backend.
 * Sets hermes_token and hermes_refresh Set-Cookie headers on success.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 });
  }

  const email = body.email;
  const password = body.password;

  if (typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ message: 'Email is required.' }, { status: 400 });
  }
  if (typeof password !== 'string' || !password.trim()) {
    return NextResponse.json({ message: 'Password is required.' }, { status: 400 });
  }

  const cookie = request.headers.get('cookie') ?? undefined;
  const { data, status } = await hermesPost('auth/login', { email: email.trim(), password }, cookie);

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