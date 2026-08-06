"use client";

import { useCallback, useEffect, useState } from "react";
import type { Message } from "@platform/utils";
import { buildConversations } from "@platform/utils";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useStationAlias } from "@/hooks/useStationAlias";
import { useTranslations } from "next-intl";
import Navbar from "@/components/Navbar";
import NewChatFab from "@/components/NewChatFab";
<<<<<<< HEAD
import { SearchInput } from "@platform/ui";
import ConversationItem from "@/components/home/ConversationItem";
import { LoadingSpinner } from "@platform/ui";
=======
import { SearchInput } from "@hermes/ui";
import ConversationItem from "@/components/home/ConversationItem";
import { LoadingSpinner } from "@hermes/ui";
>>>>>>> main

export default function Home() {
  const user = useAuthGuard();
  const t = useTranslations("home");
  const [conversations, setConversations] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [station, setStation] = useState<string | null>(null);
  const { getAlias, aliasMap } = useStationAlias();

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/messages");
      const messages: Message[] = res.ok ? await res.json() : [];
      setConversations(messages);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (user) fetchMessages();
  }, [user, fetchMessages]);

  useEffect(() => {
    fetch("/api/sys")
      .then((r) => (r.ok ? r.json() : null))
      .then((status) => { if (status?.domain) setStation(status.domain); })
      .catch(() => {});
  }, []);

  function logout() {
    localStorage.removeItem("hermes_user");
    window.location.replace("/");
  }

  const allConversations = buildConversations(conversations, aliasMap);
  const filtered = allConversations.filter((c) => {
    const alias = getAlias(c.station) ?? c.station;
    const q = search.toLowerCase();
    return alias.toLowerCase().includes(q) || c.station.toLowerCase().includes(q);
  });

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <Navbar user={user} station={station} onRefresh={fetchMessages} onLogout={logout} />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={t("searchPlaceholder")}
      />

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && <LoadingSpinner className="py-10" />}
        {error && (
          <div className="flex items-center justify-center h-32 text-red-500 dark:text-red-400 text-sm">{error}</div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-500 text-sm">
            {t("noConversations")}
          </div>
        )}
        {!loading &&
          filtered.map((conv) => (
            <ConversationItem
              key={conv.station}
              conv={conv}
              alias={getAlias(conv.station)}
            />
          ))}
      </div>

      <NewChatFab />
    </div>
  );
}
