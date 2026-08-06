"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordDialogProps {
  open: boolean;
  title: string;
  submitLabel: string;
  cancelLabel: string;
  error?: string;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

export default function PasswordDialog({
  open,
  title,
  submitLabel,
  cancelLabel,
  error,
  onSubmit,
  onCancel,
}: PasswordDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setPassword("");
      setVisible(false);
      dialog.showModal();
      setTimeout(() => inputRef.current?.focus(), 50);
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password) onSubmit(password);
  }

  return (
    <dialog
      ref={ref}
      onCancel={onCancel}
      className="rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xl p-6 w-80 max-w-[90vw] backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <h2 className="text-base font-semibold mb-4">{title}</h2>
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2 mb-2">
          <input
            ref={inputRef}
            type={visible ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm placeholder-gray-400 outline-none focus:ring-2 ${
              error ? "ring-2 ring-red-500 focus:ring-red-500" : "focus:ring-orange-500"
            }`}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="text-gray-400 hover:text-orange-500 transition-colors p-1 shrink-0"
            tabIndex={-1}
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-500 mb-3 -mt-1">{error}</p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={!password}
            className="px-4 py-2 text-sm rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
