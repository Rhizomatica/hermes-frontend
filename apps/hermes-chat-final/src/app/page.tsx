'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuthGuard } from '@hermes/shared-auth';
import { LoadingSpinner } from '@hermes/ui';

export default function ChatPage() {
  const tc = useTranslations('common');
  const user = useAuthGuard();

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <LoadingSpinner />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Link href="/" className="mb-4 text-sm text-blue-500" aria-label={tc('backToHermes')} style={{ minHeight: '44px', lineHeight: '44px' }}>
        {tc('backToHermes')}
      </Link>
      <h1 className="text-2xl font-bold">Chat</h1>
      <p className="mt-2 text-base text-foreground/70">Conversation list — coming in Phase 3</p>
    </main>
  );
}