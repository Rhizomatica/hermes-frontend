import { describe, it, expect } from 'vitest';
import { buildConversations, filterConversation } from './conversation';
import type { Message } from './types';

function makeMsg(partial: Partial<Message> & { id: number; sent_at: string }): Message {
  return {
    inbox: false,
    draft: false,
    orig: 'me',
    dest: 'PU2UIT-3',
    name: '',
    text: null,
    file: null,
    fileid: null,
    mimetype: null,
    secure: false,
    synced: false,
    unread: false,
    ...partial,
  };
}

describe('buildConversations', () => {
  it('groups sent and received messages by canonical station key', () => {
    const msgs = [
      makeMsg({ id: 1, sent_at: '2026-01-01T10:00:00Z', inbox: false, dest: 'PU2UIT-3' }),
      makeMsg({ id: 2, sent_at: '2026-01-02T10:00:00Z', inbox: true, orig: 'pu2uit-3@hermes.local' }),
    ];
    const aliasMap = new Map([['pu2uit-3', 'estacao3']]);
    const convos = buildConversations(msgs, aliasMap);

    expect(convos).toHaveLength(1);
    expect(convos[0]?.station).toBe('estacao3');
    expect(convos[0]?.lastMessage.id).toBe(2); // most recent
  });

  it('sorts conversations by most recent message', () => {
    const msgs = [
      makeMsg({ id: 1, sent_at: '2026-01-01T10:00:00Z', inbox: false, dest: 'A' }),
      makeMsg({ id: 2, sent_at: '2026-01-03T10:00:00Z', inbox: false, dest: 'B' }),
      makeMsg({ id: 3, sent_at: '2026-01-02T10:00:00Z', inbox: false, dest: 'C' }),
    ];
    const convos = buildConversations(msgs);
    expect(convos.map((c) => c.station)).toEqual(['b', 'c', 'a']);
  });

  it('splits multi-recipient sent messages into separate conversations', () => {
    const msgs = [
      makeMsg({ id: 1, sent_at: '2026-01-01T10:00:00Z', inbox: false, dest: ['A', 'B'] }),
    ];
    const convos = buildConversations(msgs);
    expect(convos.map((c) => c.station).sort()).toEqual(['a', 'b']);
  });

  it('derives unreadCount from unread flag when present', () => {
    const msgs = [
      makeMsg({ id: 1, sent_at: '2026-01-01T10:00:00Z', inbox: true, orig: 'A', unread: true }),
      makeMsg({ id: 2, sent_at: '2026-01-02T10:00:00Z', inbox: true, orig: 'A', unread: false }),
    ];
    const convos = buildConversations(msgs);
    expect(convos[0]?.unreadCount).toBe(1);
  });

  it('falls back to inbox count when unread field is absent from payload', () => {
    // Simulate an older backend payload lacking the `unread` field by
    // constructing records without it and casting through a structural shape.
    const raw = [
      { id: 1, sent_at: '2026-01-01T10:00:00Z', inbox: true, orig: 'A' },
      { id: 2, sent_at: '2026-01-02T10:00:00Z', inbox: true, orig: 'A' },
    ];
    // `unread` is absent here; the union with Message tests the fallback path.
    const convos = buildConversations(raw as unknown as Message[]);
    expect(convos[0]?.unreadCount).toBe(2);
  });
});

describe('filterConversation', () => {
  const aliasMap = new Map([['pu2uit-3', 'estacao3']]);

  it('returns only messages for the given station, oldest first', () => {
    const msgs = [
      makeMsg({ id: 2, sent_at: '2026-01-02T10:00:00Z', inbox: true, orig: 'PU2UIT-3' }),
      makeMsg({ id: 1, sent_at: '2026-01-01T10:00:00Z', inbox: false, dest: 'PU2UIT-3' }),
      makeMsg({ id: 3, sent_at: '2026-01-03T10:00:00Z', inbox: true, orig: 'OTHER' }),
    ];
    const result = filterConversation(msgs, 'estacao3', aliasMap);
    expect(result.map((m) => m.id)).toEqual([1, 2]);
  });

  it('matches by canonical alias regardless of address format', () => {
    const msgs = [
      makeMsg({ id: 1, sent_at: '2026-01-01T10:00:00Z', inbox: true, orig: 'PU2UIT-3@hermes.local' }),
    ];
    const result = filterConversation(msgs, 'estacao3', aliasMap);
    expect(result).toHaveLength(1);
  });

  it('returns empty array when no messages match', () => {
    const msgs = [
      makeMsg({ id: 1, sent_at: '2026-01-01T10:00:00Z', inbox: true, orig: 'OTHER' }),
    ];
    expect(filterConversation(msgs, 'estacao3', aliasMap)).toEqual([]);
  });
});