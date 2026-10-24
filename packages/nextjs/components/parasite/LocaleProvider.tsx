"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { type Locale, translate } from "~~/lib/parasite/i18n";

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (text: string) => string;
  dateLocale: string;
} | null>(null);
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, updateLocale] = useState<Locale>("tr");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("parasite:language");
      if (saved === "en" || saved === "tr") updateLocale(saved);
    } catch {
      /* Language switching still works without storage. */
    }
  }, []);
  const setLocale = useCallback((next: Locale) => {
    updateLocale(next);
    try {
      localStorage.setItem("parasite:language", next);
    } catch {
      /* Session preference remains usable. */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    if (window.location.pathname === "/")
      document.title = locale === "tr" ? "PARASITE — Cüzdanın Hâlâ Canlı" : "PARASITE — Your Wallet Is Alive";
  }, [locale]);
  const t = useCallback((text: string) => translate(text, locale), [locale]);
  const value = useMemo(
    () => ({ locale, setLocale, t, dateLocale: locale === "tr" ? "tr-TR" : "en-US" }),
    [locale, setLocale, t],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("LocaleProvider is required");
  return value;
}
