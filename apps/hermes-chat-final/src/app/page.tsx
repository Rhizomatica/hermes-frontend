'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth, useAuthGuard } from '@hermes/shared-auth';
import { ErrorBanner, LoadingSpinner, SearchInput } from '@hermes/ui';
import { buildConversations } from '@hermes/api';
import { useChatData } from '@/hooks/useChatData';
import { useStationAlias } from '@/hooks/useStationAlias';
import { ConversationList } from '@/components/home/ConversationList';

/**
 * Conversation list page — authenticated home for hermes-chat-final.
 *
 * Shows all conversations grouped by station, with debounced search,
 * loading/empty/error states, and a FAB to start a new chat.
 *
 * @example
 * // Rendered at /chat in co-deployed mode
 * <ConversationListPage />
 */
export default function ConversationListPage() {
  const t = useTranslations('home');
  const user = useAuthGuard();
  const { logout } = useAuth();
  const { messages, loading, error, refresh } = useChatData();
  const { aliasMap, getAlias } = useStationAlias();

  const [query, setQuery] = useState('');

  const conversations = useMemo(
    () => buildConversations(messages, aliasMap),
    [messages, aliasMap],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const alias = getAlias(c.station);
      return (
        c.station.toLowerCase().includes(q) ||
        (alias ?? '').toLowerCase().includes(q)
      );
    });
  }, [conversations, query, getAlias]);

  function resolveName(station: string): string {
    return getAlias(station) ?? station.toUpperCase();
  }

  function handleLogout() {
    logout();
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <LoadingSpinner />
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <LoadingSpinner />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <h1 className="text-xl font-bold text-orange-500">{t('title')}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            aria-label={t('refresh')}
            className="rounded-lg p-2 hover:bg-gray-200 dark:hover:bg-gray-700"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            🔄
          </button>
          <button
            onClick={handleLogout}
            className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/60 hover:text-red-500"
            style={{ minHeight: '44px' }}
          >
            {t('logout')}
          </button>
        </div>
      </header>

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={t('searchPlaceholder')}
      />

      {error && (
        <div className="px-4 pt-3">
          <ErrorBanner message={error} />
          <button
            onClick={refresh}
            className="mt-2 w-full rounded-lg px-4 py-2 text-sm text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            style={{ minHeight: '44px' }}
          >
            {t('retry')}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <ConversationList conversations={filtered} resolveName={resolveName} />
      </div>

      <div className="absolute bottom-6 right-6">
        <Link
          href="/new-chat"
          aria-label={t('newChat')}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-2xl font-bold text-white shadow-lg hover:bg-orange-600"
        >
          +
        </Link>
      </div>
    </main>
  );
}