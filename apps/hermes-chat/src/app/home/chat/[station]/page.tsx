"use client";

import { useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useChatData } from "@/hooks/useChatData";
import { useNodeInfo } from "@/hooks/useNodeInfo";
import { useStationAlias } from "@/hooks/useStationAlias";
import { useSendMessage } from "@/hooks/useSendMessage";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageList from "@/components/chat/MessageList";
import MessageInput from "@/components/chat/MessageInput";
import AttachmentPreview from "@/components/chat/AttachmentPreview";
import NextSyncBadge from "@/components/NextSyncBadge";
<<<<<<< HEAD
import { ErrorBanner } from "@platform/ui";
=======
import { ErrorBanner } from "@hermes/ui";
>>>>>>> main

export default function ChatScreen() {
  useAuthGuard();
  const params = useParams();
  const station = decodeURIComponent(params.station as string);

  const orig = useNodeInfo();
  const { getAlias, aliasMap } = useStationAlias();
  const alias = getAlias(station);
 
  const { messages, sentIds, syncedIds, loading, error: fetchError, fetchMessages, setMessages } = useChatData(station, aliasMap);

  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onSendSuccess = useCallback(async () => {
    setText("");
    setSelectedFile(null);
    setPass("");
    await fetchMessages();
    inputRef.current?.focus();
  }, [fetchMessages]);

  const { sendMessage, sending } = useSendMessage({ station, onSuccess: onSendSuccess, setError });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await sendMessage({ text, file: selectedFile, pass, orig });
  }

  const displayError = error || fetchError;

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <ChatHeader station={station} alias={alias} onRefresh={fetchMessages} />
      <NextSyncBadge />
      <MessageList
        messages={messages}
        loading={loading}
        sentIds={sentIds}
        syncedIds={syncedIds}
        onDeleted={(id) => setMessages((prev) => prev.filter((m) => m.id !== id))}
        onError={setError}
      />
      {displayError && <ErrorBanner message={displayError} />}
      {selectedFile && (
        <AttachmentPreview
          file={selectedFile}
          pass={pass}
          onRemove={() => { setSelectedFile(null); setPass(""); }}
        />
      )}
      <MessageInput
        text={text}
        onTextChange={setText}
        onFileSelect={setSelectedFile}
        onFileError={setError}
        onSubmit={handleSubmit}
        sending={sending}
        hasFile={!!selectedFile}
        station={station}
        inputRef={inputRef}
        pass={pass}
        onPassChange={setPass}
      />
    </div>
  );
}
