'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Conversation } from '@hermes/api';
import { ConversationItem } from './ConversationItem';

export interface ConversationListProps {
  /** Grouped conversations, already sorted by most recent */
  conversations: Conversation[];
  /** Resolves a canonical station key to a human-readable display name */
  resolveName: (station: string) => string;
}

/**
 * ConversationList — renders the grouped conversation rows.
 *
 * Each row navigates to the chat screen for its station. Uses semantic list
 * markup and keyboard-accessible rows via ConversationItem.
 *
 * @example
 * <ConversationList conversations={conversations} resolveName={getAlias} />
 */
export function ConversationList({ conversations, resolveName }: ConversationListProps) {
  const t = useTranslations('home');
  const router = useRouter();

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <span className="text-4xl">💬</span>
        <p className="mt-3 text-base text-foreground/60">{t('noConversations')}</p>
      </div>
    );
  }

  function open(station: string) {
    router.push(`/chat/${encodeURIComponent(station)}`);
  }

  return (
    <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
      {conversations.map((conversation) => (
        <li
          key={conversation.station}
          onClick={() => open(conversation.station)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              open(conversation.station);
            }
          }}
        >
          <ConversationItem
            conversation={conversation}
            displayName={resolveName(conversation.station)}
          />
        </li>
      ))}
    </ul>
  );
}