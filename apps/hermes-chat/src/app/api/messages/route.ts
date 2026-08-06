import { NextRequest, NextResponse } from 'next/server';
<<<<<<< HEAD
import { hermesGet, hermesPost, hermesDelete } from '@/lib/hermesApi';
import type { Message } from '@platform/utils';
=======
import { hermesGet, hermesPost, hermesDelete } from '@hermes/api';
import type { Message } from '@/lib/types';
>>>>>>> main

/**
 * Normalize a station address to its bare identifier for comparison.
 * Handles email-style (station@domain) and DNS-style (station.domain.tld).
 */
function bare(s: string) {
  const lower = s.trim().toLowerCase();
  const noAt = lower.includes('@') ? lower.split('@')[0] : lower;
  return noAt.split('.')[0];
}

export async function GET(request: NextRequest) {
  const cookie = request.headers.get('cookie') ?? undefined;

  // Fetch inbox, sent, and our own station identity in one round-trip
  const [inboxRes, sentRes, sysRes] = await Promise.all([
    hermesGet('message/type/inbox', cookie),
    hermesGet('message/type/sent', cookie),
    hermesGet('sys/status', cookie),
  ]);

  const inboxMsgs: Message[] = Array.isArray(inboxRes.data) ? (inboxRes.data as Message[]) : [];
  const sentMsgs: Message[] = Array.isArray(sentRes.data) ? (sentRes.data as Message[]) : [];

  // IDs that appeared in the sent endpoint — ground truth for "I sent this"
  const sentIds = new Set(sentMsgs.map((m) => m.id));

  // Determine who "me" is from the system status (best-effort)
  const sys = sysRes.data as { nodename?: string; domain?: string } | null;
  const myBare = bare(sys?.nodename ?? sys?.domain ?? '');

  // Merge inbox + sent, dedup by ID, then set inbox authoritatively:
  //   Primary:  orig === myStation → I sent it → inbox: false
  //   Fallback: message appeared in the sent endpoint → inbox: false
  //   Otherwise: inbox: true  (I received it)
  const seen = new Set<number>();
  const merged: Message[] = [];

  for (const msg of [...inboxMsgs, ...sentMsgs]) {
    if (seen.has(msg.id)) continue;
    seen.add(msg.id);
    const isMine = myBare ? bare(msg.orig) === myBare : sentIds.has(msg.id);
    merged.push({ ...msg, inbox: !isMine });
  }

  return NextResponse.json(merged);
};

export async function POST(request: NextRequest) {
  const cookie = request.headers.get('cookie') ?? undefined;
  const body = await request.json();
  const { data, status } = await hermesPost('message', body, cookie);
  
  return NextResponse.json(data, { status });
}

export async function DELETE(request: NextRequest) {
  const cookie = request.headers.get('cookie') ?? undefined;
  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ message: 'Missing message id.' }, { status: 400 });
  }
  const { data, status } = await hermesDelete(`message/${id}`, cookie);
  return NextResponse.json(data, { status });
}
