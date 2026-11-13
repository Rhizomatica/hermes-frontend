import { NextRequest, NextResponse } from 'next/server';
import { hermesGet, hermesPost } from '@hermes/api';

/**
 * GET /api/users
 *
 * Proxies the station's user list from hermes-radio-daemon
 * `GET /api/v2/users` (admins only). Passes the daemon's `limit` and
 * `cursor` pagination parameters through.
 *
 * @example
 * GET /api/users?limit=25
 * → 200 { data: HermesUser[], next_cursor? }
 */
export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') ?? undefined;
    const authorization = request.headers.get('authorization') ?? undefined;

    const query = new URLSearchParams();
    const limit = request.nextUrl.searchParams.get('limit');
    const cursor = request.nextUrl.searchParams.get('cursor');
    if (limit) query.set('limit', limit);
    if (cursor) query.set('cursor', cursor);
    const qs = query.toString();

    const { data, status } = await hermesGet(
      `/api/v2/users${qs ? `?${qs}` : ''}`,
      cookie,
      authorization,
    );
    return NextResponse.json(data, { status });
  } catch (error) {
    console.error('[GET /api/users]', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/users
 *
 * Creates a user and their mailbox via hermes-radio-daemon
 * `POST /api/v2/users` (admins only). Returns 201 with the created `User`,
 * or the daemon's problem+json error (409, 422, …).
 *
 * @example
 * POST /api/users
 * { "username": "pu2uit", "password": "long-password" }
 * → 201 { id, username, role, … }
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }

    const cookie = request.headers.get('cookie') ?? undefined;
    const authorization = request.headers.get('authorization') ?? undefined;

    const { data, status } = await hermesPost(
      '/api/v2/users',
      body,
      cookie,
      authorization,
    );
    return NextResponse.json(data, { status });
  } catch (error) {
    console.error('[POST /api/users]', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
