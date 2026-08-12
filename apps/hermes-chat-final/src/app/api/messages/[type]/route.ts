import { NextRequest, NextResponse } from 'next/server';
import { hermesGet } from '@hermes/api';

const ALLOWED_TYPES = new Set(['inbox', 'sent', 'draft']);

/**
 * GET /api/messages/[type]
 *
 * Proxies a single message-type listing from hermes-backend.
 * Allowed types: inbox, sent, draft.
 *
 * @example
 * GET /api/messages/sent
 * → 200 { data: Message[] }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  try {
    const { type } = await params;
    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ message: 'Invalid message type.' }, { status: 400 });
    }
    const cookie = request.headers.get('cookie') ?? undefined;
    const { data, status } = await hermesGet(`/message/type/${type}`, cookie);
    return NextResponse.json({ data }, { status });
  } catch (error) {
    console.error(`[GET /api/messages/[type]]`, error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}