"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import type { Conversation } from "@platform/utils";
import { formatTimeOrDate } from "@platform/utils";

interface ConversationItemProps {
  conv: Conversation;
  alias: string | null;
}

export default function ConversationItem({ conv, alias }: ConversationItemProps) {
  const t = useTranslations("home");
  const locale = useLocale();
  const displayName = alias ?? conv.station;

  return (
    <Link
      href={`/home/chat/${encodeURIComponent(conv.station)}`}
      className="flex items-center px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700/60 border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors"
    >
      {/* Avatar */}
      <div className="w-12 h-12 shrink-0 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-lg mr-3 uppercase">
        {displayName.split("", 2)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <div className="min-w-0">
            <span className="text-gray-900 dark:text-white font-medium truncate block">
              {displayName}
            </span>
            {alias && (
              <span className="text-xs text-gray-400 dark:text-gray-500 truncate block">
                {conv.station}
              </span>
            )}
          </div>
          <span className="text-gray-400 dark:text-gray-500 text-xs shrink-0 ml-2">
            {formatTimeOrDate(conv.lastMessage.sent_at, locale)}
          </span>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm truncate">
          {conv.lastMessage.inbox ? "" : `${t("you")}: `}
          {conv.lastMessage.text || conv.lastMessage.name}
        </p>
      </div>
    </Link>
  );
}
