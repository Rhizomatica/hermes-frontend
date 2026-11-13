import { NextRequest, NextResponse } from 'next/server';
import { hermesDelete, hermesGet, hermesPatch } from '@hermes/api';

/** Validate the {userId} path segment; null when it is not a positive integer. */
function userIdFrom(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function invalidId(): NextResponse {
  return NextResponse.json({ message: 'Invalid user id.' }, { status: 400 });
}

/**
 * GET /api/users/{userId}
 *
 * Proxies one user from hermes-radio-daemon `GET /api/v2/users/{user_id}`
 * (admins, or the user themselves).
 *
 * @example
 * GET /api/users/7
 * → 200 { id, username, display_name, role, … }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const id = userIdFrom(userId);
  if (id == null) return invalidId();

  try {
    const cookie = request.headers.get('cookie') ?? undefined;
    const authorization = request.headers.get('authorization') ?? undefined;
    const { data, status } = await hermesGet(
      `/api/v2/users/${id}`,
      cookie,
      authorization,
    );
    return NextResponse.json(data, { status });
  } catch (error) {
    console.error(`[GET /api/users/${userId}]`, error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/users/{userId}
 *
 * Applies a partial update via hermes-radio-daemon
 * `PATCH /api/v2/users/{user_id}`. Non-admins may change only their own
 * display name, phone and location; `root` cannot be changed.
 *
 * @example
 * PATCH /api/users/7
 * { "display_name": "Radio Operator", "phone": null }
 * → 200 { id, username, … }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const id = userIdFrom(userId);
  if (id == null) return invalidId();

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }

    const cookie = request.headers.get('cookie') ?? undefined;
    const authorization = request.headers.get('authorization') ?? undefined;
    const { data, status } = await hermesPatch(
      `/api/v2/users/${id}`,
      body,
      cookie,
      authorization,
    );
    return NextResponse.json(data, { status });
  } catch (error) {
    console.error(`[PATCH /api/users/${userId}]`, error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/users/{userId}
 *
 * Deletes a user and their mailbox via hermes-radio-daemon
 * `DELETE /api/v2/users/{user_id}` (admins only; `root` cannot be deleted).
 *
 * @example
 * DELETE /api/users/7
 * → 204
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const id = userIdFrom(userId);
  if (id == null) return invalidId();

  try {
    const cookie = request.headers.get('cookie') ?? undefined;
    const authorization = request.headers.get('authorization') ?? undefined;
    const { data, status } = await hermesDelete(
      `/api/v2/users/${id}`,
      cookie,
      authorization,
    );
    if (status === 204) return new NextResponse(null, { status });
    return NextResponse.json(data, { status });
  } catch (error) {
    console.error(`[DELETE /api/users/${userId}]`, error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
