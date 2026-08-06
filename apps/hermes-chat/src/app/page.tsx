"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@hermes/ui";
import { useTranslations } from "next-intl";
import { useLocale } from "@/providers/LocaleProvider";

export default function Login() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const { locale, setLocale } = useLocale();
  const t = useTranslations("login");
  const tTheme = useTranslations("theme");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(t("invalidCredentials"));
        return;
      }

      localStorage.setItem("hermes_user", JSON.stringify(data));
      router.push("/home");
    } catch {
      setError(t("connectionError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-1 flex-col justify-center bg-gray-50 dark:bg-gray-900 px-6 lg:px-8">
      <button
        onClick={toggle}
        aria-label={tTheme("toggle")}
        className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-lg"
      >
        {theme === "dark" ? <span aria-label={tTheme("lightMode")} role="img">☀</span> : <span aria-label={tTheme("darkMode")} role="img">⏾</span>}
      </button>
      <button
        onClick={() => setLocale(locale === "pt" ? "en" : "pt")}
        aria-label="Switch language"
        className="absolute top-4 right-16 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-xs font-semibold"
      >
        {locale === "pt" ? "EN" : "PT"}
      </button>
      <div className="sm:mx-auto sm:w-full sm:max-w-sm object-center">
        <Image
          className="dark:invert object-none object-center mx-auto"
          src="/logo-hermes-500.png"
          alt="HERMES CHAT"
          width={190}
          height={127}
          priority
        />
        <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-gray-900 dark:text-white">
          {t("title")}
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
              {t("username")}
            </label>
            <div className="mt-2">
              <input
                id="email"
                name="email"
                type="text"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-md bg-white dark:bg-gray-700 px-3 py-1.5 text-base text-gray-900 dark:text-white outline outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-orange-400 sm:text-sm/6"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                {t("password")}
              </label>
              <div className="text-sm">
                <a href="#" className="font-semibold text-orange-500 hover:text-orange-400">
                  {t("forgotPassword")}
                </a>
              </div>
            </div>
            <div className="mt-2">
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-md bg-white dark:bg-gray-700 px-3 py-1.5 text-base text-gray-900 dark:text-white outline outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-orange-400 sm:text-sm/6"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-orange-500 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-sm hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t("signingIn") : t("signIn")}
            </button>
          </div>
        </form>

        <div className="mt-10 text-center">
          <a href="#" className="font-semibold text-sm/6 text-orange-500 hover:text-orange-400">
            Rhizomatica
          </a>
        </div>
      </div>
    </div>
  );
}
