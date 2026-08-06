import { formatTime } from "@platform/utils";
import type { Message } from "@platform/utils";
import DeleteMessageButton from "@/components/DeleteMessageButton";
import DoubleCheck from "@/components/DoubleCheck";
import FileAttachment from "./FileAttachment";
<<<<<<< HEAD
import { PasswordDialog } from "@platform/ui";
=======
import { PasswordDialog } from "@hermes/ui";
>>>>>>> main
import { Lock, Loader2 } from "lucide-react";
import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";

interface MessageBubbleProps {
    msg: Message;
    sentIds: Set<number>;
    syncedIds: Set<number>;
    onDeleted: (id: number) => void;
    onError: (msg: string) => void;
    deleteLabel: string;
}

export default function MessageBubble({
    msg,
    sentIds,
    syncedIds,
    onDeleted,
    onError,
    deleteLabel,
}: MessageBubbleProps) {
    const t = useTranslations("chat");
    const isMine = !msg.inbox;
    const isAudio = !!(msg.file && msg.fileid && msg.mimetype?.startsWith("audio/"));
    const [dialogOpen, setDialogOpen] = useState(false);
    const [password, setPassword] = useState<string | null>(null);
    const [text, setText] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [wrongPassword, setWrongPassword] = useState(false);
    const unlocked = !msg.secure || password !== null;

    const handlePasswordSubmit = useCallback(async (pw: string) => {
        setVerifying(true);
        try {
            const res = await fetch(`/api/messages/uncrypt/${msg.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pass: pw }),
            });
            if (!res.ok) {
                setWrongPassword(true);
                return;
            }
            setWrongPassword(false);
            setPassword(pw);
            const data = await res.json();
            if (!data.message) {
                setWrongPassword(true);
                return;
            }
            setText(data.message);
            setDialogOpen(false);
        } catch {
            setWrongPassword(true);
        } finally {
            setVerifying(false);
        }
    }, [msg.id]);

    return (
        <div className={`flex mb-1 items-end gap-1 ${isMine ? "justify-end" : "justify-start"}`}>
            {isMine && (
                <DeleteMessageButton
                    messageId={msg.id}
                    onDeleted={() => onDeleted(msg.id)}
                    onError={onError}
                    label={deleteLabel}
                />
            )}
            <div
                className={`${isAudio ? "w-[90%] sm:w-[70%]" : "max-w-[75%] sm:max-w-[60%]"} rounded-2xl px-4 py-2 shadow ${isMine
                        ? "bg-gray-800 shadow text-white rounded-br-sm"
                        : "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white rounded-bl-sm"
                    }`}
            >
                {text && <p className="text-md opacity-100 whitespace-pre-wrap break-words">{text}</p>}

                {!unlocked ? (
                    <button
                        type="button"
                        onClick={() => { setWrongPassword(false); setDialogOpen(true); }}
                        className="flex items-center gap-2 py-1 text-sm opacity-70 hover:opacity-100 transition-opacity"
                    >
                        {verifying
                            ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden="true" />
                            : <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />}
                        <span>{t("unlockMessage")}</span>
                    </button>
                ) : msg.file && msg.fileid && msg.mimetype ? (
                    <FileAttachment
                        file={msg.file}
                        fileid={msg.fileid}
                        mimetype={msg.mimetype}
                        text={text ?? msg.text}
                        password={password ?? undefined}
                    />
                ) : (<div>
                    <p className="text-md opacity-100 whitespace-pre-wrap break-words">{text ?? msg.text}</p>
                    </div>
                )}

                <p className={`text-xs mt-1 opacity-60 flex items-center gap-1 ${isMine ? "justify-end" : "justify-start"}`}>
                    <span>{formatTime(msg.sent_at)}</span>
                    {msg.secure && <Lock className="w-3 h-3" aria-hidden="true" />}
                    {isMine && sentIds.has(msg.id) && (
                        <DoubleCheck synced={syncedIds.has(msg.id)} />
                    )}
                </p>
            </div>

            <PasswordDialog
                open={dialogOpen}
                title={t("enterPassword")}
                submitLabel={verifying ? "…" : t("unlock")}
                cancelLabel={t("cancel")}
                error={wrongPassword ? t("wrongPassword") : undefined}
                onSubmit={handlePasswordSubmit}
                onCancel={() => { setDialogOpen(false); setWrongPassword(false); }}
            />
        </div>
    );
}
