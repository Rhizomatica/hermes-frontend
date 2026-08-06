"use client";

import { useTranslations } from "next-intl";
import type { Message } from "@platform/utils";
import { isSameDay } from "@platform/utils";
import { useScrollPager } from "@/hooks/useScrollPager";
import DateDivider from "./DateDivider";
import MessageBubble from "./MessageBubble";
<<<<<<< HEAD
import { LoadingSpinner } from "@platform/ui";
=======
import { LoadingSpinner } from "@hermes/ui";
>>>>>>> main

interface MessageListProps {
    messages: Message[];
    loading: boolean;
    sentIds: Set<number>;
    syncedIds: Set<number>;
    onDeleted: (id: number) => void;
    onError: (msg: string) => void;
}

export default function MessageList({
    messages,
    loading,
    sentIds,
    syncedIds,
    onDeleted,
    onError,
}: MessageListProps) {
    const t = useTranslations("chat");
    const { scrollRef, offset, loadingMore } = useScrollPager({
        totalCount: messages.length,
        resetDep: messages,
    });

    const visibleMessages = messages.slice(offset);

    return (
        <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col">
            {/* spacer pushes messages to the bottom when they don't fill the viewport */}
            {loadingMore  && <LoadingSpinner className="py-10" />}
            {loading && <LoadingSpinner className="py-10" />}   
            <div className="flex-1" />
            <div className="px-4 py-4 space-y-1">

                {!loading && messages.length === 0 && (
                    <div className="flex justify-center text-gray-400 dark:text-gray-500 text-sm py-10">
                        {t("noMessages")}
                    </div>
                )}
                {!loading &&
                    visibleMessages.map((msg, i) => {
                        const prevMsg = i === 0 ? messages[offset - 1] : visibleMessages[i - 1];
                        const showDivider = !prevMsg || !isSameDay(prevMsg.sent_at, msg.sent_at);
                        return (
                            <div key={msg.id} className="group">
                                {showDivider && <DateDivider dateStr={msg.sent_at} />}
                                <MessageBubble
                                    msg={msg}
                                    sentIds={sentIds}
                                    syncedIds={syncedIds}
                                    onDeleted={onDeleted}
                                    onError={onError}
                                    deleteLabel={t("deleteMessage")}
                                />
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}
