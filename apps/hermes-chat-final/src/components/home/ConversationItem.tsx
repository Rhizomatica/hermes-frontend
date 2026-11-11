'use client';

import { useTranslations } from 'next-intl';
import type { Conversation } from '@hermes/api';
import { formatRelativeTime } from '@/lib/formatting';

export interface ConversationItemProps {
  /** The conversation to render */
  conversation: Conversation;
  /** Human-readable station name (alias or callsign) */
  displayName: string;
}

/**
 * ConversationItem — a single row in the conversation list.
 *
 * Shows the station avatar/initials, display name, the last message preview
 * (with a 📎 marker for file attachments), a relative timestamp, and an
 * unread badge when unreadCount > 0.
 *
 * @example
 * <ConversationItem conversation={c} displayName="Estação 3" />
 */
export function ConversationItem({ conversation, displayName }: ConversationItemProps) {
  const t = useTranslations('home');

  const initials = displayName.slice(0, 2).toUpperCase();
  const last = conversation.lastMessage;
  const preview = last.file
    ? `📎 ${last.file}`
    : (last.text ?? '');

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t('openConversation', { station: displayName })}
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-semibold text-white">
        {initials}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-base font-semibold">{displayName}</span>
          <span className="shrink-0 text-xs text-foreground/50">
            {formatRelativeTime(last.sent_at)}
          </span>
        </div>
        <p className="truncate text-sm text-foreground/60">{preview}</p>
      </div>

      {conversation.unreadCount > 0 && (
        <span
          className="flex h-6 min-w-6 items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-semibold text-white"
          aria-label={t('unreadCount', { count: conversation.unreadCount })}
        >
          {conversation.unreadCount}
        </span>
      )}
    </div>
  );
}