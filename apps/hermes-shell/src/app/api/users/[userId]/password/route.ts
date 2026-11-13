import { NextRequest, NextResponse } from 'next/server';
import { hermesPut } from '@hermes/api';

/**
 * PUT /api/users/{userId}/password
 *
 * Changes a user's password via hermes-radio-daemon
 * `PUT /api/v2/users/{user_id}/password`. Non-admins changing their own
 * password must send `current_password`; admins may omit it. `root` cannot
 * be changed. On success the daemon answers 204 and ends that user's other
 * sessions.
 *
 * @example
 * PUT /api/users/7/password
 * { "current_password": "old", "new_password": "new-long-password" }
 * → 204
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  if (!/^\d+$/.test(userId) || Number(userId) <= 0) {
    return NextResponse.json({ message: 'Invalid user id.' }, { status: 400 });
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }

    const cookie = request.headers.get('cookie') ?? undefined;
    const authorization = request.headers.get('authorization') ?? undefined;
    const { data, status } = await hermesPut(
      `/api/v2/users/${userId}/password`,
      body,
      cookie,
      authorization,
    );
    if (status === 204) return new NextResponse(null, { status });
    return NextResponse.json(data, { status });
  } catch (error) {
    console.error(`[PUT /api/users/${userId}/password]`, error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
