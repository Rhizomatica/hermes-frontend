"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggle: () => {},
});

const STORAGE_KEY = "hermes-theme";

/**
 * Read a cookie value by name.
 *
 * Cookies are host-scoped (not port-scoped), so a cookie set on
 * localhost:4000 is readable on localhost:4001. This makes them the
 * correct persistence layer for sharing the theme across the shell and
 * sub-apps, mirroring how auth tokens are shared (ADR-003).
 */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]*)`)
  );
  return match ? match[1] : null;
}

/** Persist the theme to both a cookie (cross-origin) and localStorage (dev fallback). */
function setCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  // Path=/ so it applies everywhere; long-lived (5 years); SameSite=Lax.
  document.cookie = `${name}=${value}; Path=/; SameSite=Lax; Max-Age=157680000`;
}

/**
 * Resolve the theme from the earliest authoritative source:
 * cookie (shared across sub-apps) → localStorage → system preference.
 */
function readTheme(): Theme {
  // 1. The <html>.dark class is set synchronously by the inline flash-prevention
  //    script before React hydrates, so it reflects the latest state in the
  //    current document (including same-origin co-deployed mode).
  if (typeof document !== "undefined") {
    if (document.documentElement.classList.contains("dark")) return "dark";
  }

  // 2. Shared cookie (host-scoped, crosses ports in dev).
  const saved =
    getCookie(STORAGE_KEY) ??
    (typeof localStorage !== "undefined"
      ? localStorage.getItem(STORAGE_KEY)
      : null);
  if (saved === "dark" || saved === "light") return saved;

  // 3. System preference.
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Resolve the theme synchronously on the first render so downstream
  // consumers (e.g. MapView) initialize with the correct style instead of
  // the "dark" default and a follow-up `setStyle` that races map load.
  const [theme, setTheme] = useState<Theme>(() => readTheme());

  const applyTheme = useCallback((next: Theme) => {
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);

  // Keep the <html> class in sync with the resolved theme (guards against
  // SSR/client mismatch and mirrors the flash-prevention inline script).
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Sync with other tabs/windows (shell ↔ GPS ↔ chat are separate documents).
  // The `storage` event fires in documents other than the one that wrote
  // localStorage, allowing an already-open GPS page to reflect a theme
  // change made in the shell without a manual reload.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      const value = event.newValue;
      if (value === "dark" || value === "light") {
        applyTheme(value);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [applyTheme]);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setCookie(STORAGE_KEY, next);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, next);
    }
    applyTheme(next);
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}