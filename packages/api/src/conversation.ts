import type { Message, Conversation } from './types';
import { destArray, canonicalize } from './normalize';

export type { Conversation } from './types';

/**
 * Build one conversation entry per remote station from a merged message list.
 *
 * inbox:false = I sent it  → other party is `dest`
 * inbox:true  = I received it → other party is `orig`
 *
 * When `aliasMap` is provided, both the real callsign and the alias collapse
 * to the same entry keyed by the alias (e.g. "PU2UIT-3" and "estacao3" →
 * "estacao3").
 *
 * Conversations are sorted by most recent message (descending).
 * `unreadCount` is derived from the server-provided `unread` flag when
 * present; otherwise it falls back to counting inbound (`inbox`) messages.
 *
 * @example
 * const conversations = buildConversations(messages, aliasMap);
 */
export function buildConversations(
  messages: Message[],
  aliasMap: Map<string, string> = new Map(),
): Conversation[] {
  // Map from canonical alias key → canonical string + messages
  const stationMap = new Map<string, { canonical: string; msgs: Message[] }>();

  for (const msg of messages) {
    const parties = msg.inbox
      ? [msg.orig] // received: other party = sender
      : destArray(msg.dest); // sent: other party = each recipient

    for (const party of parties) {
      const key = canonicalize(party, aliasMap);
      if (!stationMap.has(key)) stationMap.set(key, { canonical: key, msgs: [] });
      stationMap.get(key)?.msgs.push(msg);
    }
  }

  return Array.from(stationMap.values())
    .map(({ canonical, msgs }) => {
      const sorted = [...msgs].sort(
        (a, b) => sentAt(b) - sentAt(a),
      );
      const lastMessage = sorted[0];
      // Prefer the server-provided unread flag; fall back to inbox count.
      const hasUnreadFlag = msgs.some((m) => typeof m.unread === 'boolean');
      const unreadCount = hasUnreadFlag
        ? msgs.filter((m) => m.unread).length
        : msgs.filter((m) => m.inbox).length;
      return {
        station: canonical,
        lastMessage,
        unreadCount,
      };
    })
    .sort((a, b) => sentAt(b.lastMessage) - sentAt(a.lastMessage));
}

/**
 * Return all messages belonging to a conversation with `station`, oldest first.
 *
 * Matches messages by canonical alias so that e.g. "PU2UIT-3" and "estacao3"
 * are treated as the same party when `aliasMap` is provided.
 *
 * @example
 * const msgs = filterConversation(messages, 'estacao3', aliasMap);
 */
export function filterConversation(
  messages: Message[],
  station: string,
  aliasMap: Map<string, string> = new Map(),
): Message[] {
  const canonical = canonicalize(station, aliasMap);
  return messages
    .filter((msg) =>
      msg.inbox
        ? canonicalize(msg.orig, aliasMap) === canonical
        : destArray(msg.dest).some((d) => canonicalize(d, aliasMap) === canonical),
    )
    .sort((a, b) => sentAt(a) - sentAt(b));
}

/**
 * Safely extract an epoch-millisecond timestamp from a message. Malformed or
 * absent `sent_at` values collapse to `-Infinity` so sorting remains stable and
 * such messages never masquerade as "most recent".
 */
function sentAt(msg: Message): number {
  const t = new Date(msg.sent_at).getTime();
  return Number.isFinite(t) ? t : -Infinity;
}
