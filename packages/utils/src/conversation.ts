import type { Message } from "./message";
import { destArray } from "./message";

export interface Conversation {
  station: string;
  lastMessage: Message;
  unread: number;
}

/**
 * Normalize a station address to its bare identifier.
 * Handles both email-style ("station@domain") and DNS-style ("station.domain.tld").
 * Assumes station base names do not contain dots or @ signs.
 */
export function stationId(s: string): string {
  const trimmed = s.trim().toLowerCase();
  // Strip @domain (email/Hermes format)
  const noAt = trimmed.includes('@') ? trimmed.split('@')[0] : trimmed;
  // Strip .domain suffix (DNS hostname format)
  return noAt.split('.')[0];
}

/**
 * Resolve a station address to its canonical alias key.
 *
 * aliasMap is Map<stationId(realName), alias>  e.g.  { "pu2uit-3" => "estacao3" }
 *
 * Both the real callsign and the alias resolve to the same canonical string:
 *   canonicalize("PU2UIT-3", map) → stationId → "pu2uit-3" → map.get → "estacao3"
 *   canonicalize("estacao3",  map) → stationId → "estacao3"  → map.get → undefined → "estacao3"
 */
export function canonicalize(address: string, aliasMap: Map<string, string>): string {
  const id = stationId(address);
  return aliasMap.get(id) ?? id;
}

/**
 * Build one conversation entry per remote station from a merged message list.
 * inbox:false = I sent it  → other party is dest
 * inbox:true  = I received it → other party is orig
 *
 * When aliasMap is provided, both the real callsign and the alias collapse to
 * the same entry keyed by the alias (e.g. "PU2UIT-3" and "estacao3" → "estacao3").
 */
export function buildConversations(
  messages: Message[],
  aliasMap: Map<string, string> = new Map(),
): Conversation[] {
  // Map from canonical alias key → canonical string + messages
  const stationMap = new Map<string, { canonical: string; msgs: Message[] }>();

  for (const msg of messages) {
    const parties = msg.inbox
      ? [msg.orig]                    // received: other party = sender
      : destArray(msg.dest);          // sent: other party = each recipient

    for (const party of parties) {
      const key = canonicalize(party, aliasMap);
      if (!stationMap.has(key)) stationMap.set(key, { canonical: key, msgs: [] });
      stationMap.get(key)!.msgs.push(msg);
    }
  }

  return Array.from(stationMap.values())
    .map(({ canonical, msgs }) => {
      const sorted = [...msgs].sort(
        (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime(),
      );
      return {
        station: canonical,
        lastMessage: sorted[0],
        unread: msgs.filter((m) => m.inbox).length, //TODO - verify if it`s enough to check inbox flag or if we also need a read flag from the API
      };
    })
    .sort(
      (a, b) =>
        new Date(b.lastMessage.sent_at).getTime() -
        new Date(a.lastMessage.sent_at).getTime(),
    );
}

/**
 * Return all messages belonging to a conversation with `station`, oldest first.
 * Matches messages by canonical alias so that e.g. "PU2UIT-3" and "estacao3"
 * are treated as the same party when aliasMap is provided.
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
    .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());
}
