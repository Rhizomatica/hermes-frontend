import { NextRequest, NextResponse } from 'next/server';
import { hermesGet, hermesPost, hermesDelete, stationId } from '@hermes/api';
import type { Message } from '@hermes/api';

/**
 * GET /api/messages
 *
 * Merges inbox and sent messages from hermes-backend, deduplicating by ID
 * and setting the `inbox` flag authoritatively:
 *   - Primary:  `orig === myStationId` → I sent it → inbox: false
 *   - Fallback: message appeared in the sent endpoint → inbox: false
 *   - Otherwise: inbox: true (I received it)
 *
 * Returns the merged array sorted by `sent_at` descending.
 *
 * @example
 * GET /api/messages
 * → 200 { data: Message[] }
 */
export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') ?? undefined;

    // Fetch inbox, sent, and our own station identity in one round-trip
    const [inboxRes, sentRes, sysRes] = await Promise.all([
      hermesGet('/message/type/inbox', cookie),
      hermesGet('/message/type/sent', cookie),
      hermesGet('/sys/status', cookie),
    ]);

    const inboxMsgs: Message[] = Array.isArray(inboxRes.data)
      ? (inboxRes.data as Message[])
      : [];
    const sentMsgs: Message[] = Array.isArray(sentRes.data)
      ? (sentRes.data as Message[])
      : [];

    // IDs from the sent endpoint — ground truth for "I sent this"
    const sentIds = new Set(sentMsgs.map((m) => m.id));

    // Best-effort station identity from system status
    const sys = sysRes.data as { nodename?: string; domain?: string } | null;
    const myStationId = stationId(sys?.nodename ?? sys?.domain ?? '');

    const seen = new Set<number>();
    const merged: Message[] = [];

    for (const msg of [...inboxMsgs, ...sentMsgs]) {
      if (seen.has(msg.id)) continue;
      seen.add(msg.id);
      const isMine = myStationId
        ? stationId(msg.orig) === myStationId
        : sentIds.has(msg.id);
      merged.push({ ...msg, inbox: !isMine });
    }

    merged.sort(
      (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime(),
    );

    return NextResponse.json({ data: merged }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/messages]', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/messages
 *
 * Proxies a new outgoing message to hermes-backend.
 *
 * @example
 * POST /api/messages { text, dest, ... }
 * → 200 { data: Message }
 */
export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') ?? undefined;
    const body = await request.json();
    const { data, status } = await hermesPost('/message', body, cookie);
    return NextResponse.json(data, { status });
  } catch (error) {
    console.error('[POST /api/messages]', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/messages
 *
 * Proxies a message deletion to hermes-backend.
 *
 * @example
 * DELETE /api/messages { id: 42 }
 * → 200 { data }
 */
export async function DELETE(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') ?? undefined;
    const body = (await request.json()) as { id?: number };
    if (typeof body.id !== 'number') {
      return NextResponse.json(
        { message: 'Missing message id.' },
        { status: 400 },
      );
    }
    const { data, status } = await hermesDelete(`/message/${body.id}`, cookie);
    return NextResponse.json(data, { status });
  } catch (error) {
    console.error('[DELETE /api/messages]', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}