"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "@hermes/ui";
import { useLocale } from "@/providers/LocaleProvider";
import { useTranslations } from "next-intl";
import type { HermesUser } from "@platform/utils";
import { Globe, LogOut, Menu, Moon, Radio, RefreshCw, Sun, X } from "lucide-react";

interface NavbarProps {
  user?: HermesUser | null;
  station?: string | null;
  onRefresh?: () => void;
  onLogout?: () => void;
  /** Optional left-side slot (e.g. back button + station name for the chat screen) */
  left?: React.ReactNode;
}

export default function Navbar({ user, station, onRefresh, onLogout, left }: NavbarProps) {
  const { theme, toggle } = useTheme();
  const { locale, setLocale } = useLocale();
  const t = useTranslations("home");
  const tTheme = useTranslations("theme");
  const tRadio = useTranslations("radioInfo");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close menu when clicking outside
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  return (
    <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 shrink-0">
      {/* Left side */}
      {left ?? (
        <div className="flex items-center gap-1">
          <Image src="/logo-hermes-500-wings.png" alt="HERMES" width={68} height={46} className="dark:invert" />
          <span className="text-gray-700 dark:text-white font-semibold text-md">HERMES Chat</span>
        </div>
      )}

      {/* Burger menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Open menu"
          aria-expanded={open}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {open ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
            {/* Username */}
            {user && (
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                {station && (
                  <p className="text-xs text-orange-500 font-semibold truncate mt-0.5">{station}</p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{t("loggedInAs")}</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                  {user.name || user.email}
                </p>
              </div>
            )}

            {/* Theme toggle */}
            <button
              onClick={() => { toggle(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
              {theme === "dark" ? tTheme("lightMode") : tTheme("darkMode")}
            </button>

            {/* Locale toggle */}
            <button
              onClick={() => { setLocale(locale === "pt" ? "en" : "pt"); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Globe className="w-4 h-4" aria-hidden="true" />
              {locale === "pt" ? "English" : "Português"}
            </button>

            {/* Refresh */}
            {onRefresh && (
              <button
                onClick={() => { onRefresh(); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                {t("refresh")}
              </button>
            )}

            {/* Radio Info */}
            <button
              onClick={() => { router.push("/home/radio-info"); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Radio className="w-4 h-4" aria-hidden="true" />
              {tRadio("menuLabel")}
            </button>

            {/* Logout */}
            {onLogout && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-700" />
                <button
                  onClick={() => { onLogout(); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  {t("logout")}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
