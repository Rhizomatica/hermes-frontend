"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useTranslations } from "next-intl";
import Navbar from "@/components/Navbar";
<<<<<<< HEAD
import { SearchInput } from "@platform/ui";
import { LoadingSpinner } from "@platform/ui";
import type { Message } from "@platform/utils";
import { buildConversations, stationId, canonicalize } from "@platform/utils";
=======
import { SearchInput } from "@hermes/ui";
import { LoadingSpinner } from "@hermes/ui";
import type { Message } from "@/lib/message";
import { buildConversations, stationId, canonicalize } from "@/lib/conversation";
>>>>>>> main

interface Station {
  name: string;
  alias: string;
}

export default function NewChatPage() {
  useAuthGuard();
  const t = useTranslations("newChat");
  const router = useRouter();

  const [stations, setStations] = useState<Station[]>([]);
  const [existingStations, setExistingStations] = useState<Set<string>>(new Set());
  const [aliasMap, setAliasMap] = useState<Map<string, string>>(new Map());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [stationsRes, messagesRes] = await Promise.all([
        fetch("/api/stations"),
        fetch("/api/messages"),
      ]);

      const stationList: Station[] = stationsRes.ok ? await stationsRes.json() : [];
      const messages: Message[] = messagesRes.ok ? await messagesRes.json() : [];

      // Build alias map so buildConversations collapses callsign + alias to one entry
      const newAliasMap = new Map<string, string>();
      for (const s of stationList) if (s.alias) newAliasMap.set(stationId(s.name), s.alias);
      setAliasMap(newAliasMap);

      const conversations = buildConversations(messages, newAliasMap);
      // c.station is now the canonical alias (e.g. "estacao3" for PU2UIT-3)
      setExistingStations(new Set(conversations.map((c) => c.station)));
      setStations(Array.isArray(stationList) ? stationList : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = stations.filter((s) => {
    // Resolve the station to its canonical alias (same logic as buildConversations)
    if (existingStations.has(canonicalize(s.name, aliasMap))) return false;
    const q = search.toLowerCase();
    return s.alias.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
  });

  function handleSelect(name: string) {
    // Navigate using the alias so the URL matches the conversation list
    const alias = aliasMap.get(stationId(name));
    router.push(`/home/chat/${encodeURIComponent(alias ?? name)}`);
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar
        left={
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/home"
              className="text-orange-500 hover:text-orange-400 shrink-0"
              aria-label={t("back")}
            >
              <ChevronLeft className="w-6 h-6" aria-hidden="true" />
            </Link>
            <span className="text-gray-900 dark:text-white font-semibold text-base">
              {t("selectStation")}
            </span>
          </div>
        }
      />

      <SearchInput
        autoFocus
        value={search}
        onChange={setSearch}
        placeholder={t("stationSearchPlaceholder")}
      />

      <div className="flex-1 overflow-y-auto">
        {loading && <LoadingSpinner className="py-10" />}
        {!loading && filtered.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-500 text-sm">
            {t("noStations")}
          </div>
        )}
        {!loading &&
          filtered.map((s) => (
            <button
              key={s.name}
              onClick={() => handleSelect(s.name)}
              className="w-full flex items-center px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700/60 border-b border-gray-100 dark:border-gray-800 transition-colors text-left"
            >
              <div className="w-12 h-12 shrink-0 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-lg mr-3 uppercase">
                {(s.alias || s.name).split("", 2)}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-gray-900 dark:text-white font-medium truncate block">
                  {s.alias || s.name}
                </span>
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}
