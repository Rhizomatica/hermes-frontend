"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
<<<<<<< HEAD
import { ConfirmDialog } from "@platform/ui";
=======
import { ConfirmDialog } from "@hermes/ui";
>>>>>>> main
import { Trash2 } from "lucide-react";

interface DeleteMessageButtonProps {
  messageId: number;
  onDeleted: () => void;
  onError: (msg: string) => void;
  label: string;
}

export default function DeleteMessageButton({ messageId, onDeleted, onError, label }: DeleteMessageButtonProps) {
  const t = useTranslations("chat");
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setConfirming(false);
    setDeleting(true);
    try {
      const res = await fetch("/api/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: messageId }),
      });
      if (!res.ok) {
        const data = await res.json();
        onError(data?.message ?? t("deleteError"));
      } else {
        onDeleted();
      }
    } catch {
      onError(t("deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={deleting}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 disabled:opacity-30 mb-1 shrink-0"
        aria-label={label}
      >
        <Trash2 className="w-4 h-4" aria-hidden="true" />
      </button>
      <ConfirmDialog
        open={confirming}
        title={t("confirmDeleteTitle")}
        message={t("confirmDeleteMessage")}
        confirmLabel={t("confirm")}
        cancelLabel={t("cancel")}
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
