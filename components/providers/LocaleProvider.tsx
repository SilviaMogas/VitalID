"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  formatDate,
  formatNumber,
  getDirection,
  translate,
  type TranslationKey,
} from "@/lib/i18n";
import type { Locale } from "@/types";

interface LocaleContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  n: (value: number, decimals?: number) => string;
  d: (iso: string, opts?: Intl.DateTimeFormatOptions) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "en" || stored === "ar") setLocaleState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = getDirection(locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir: getDirection(locale),
      setLocale,
      toggleLocale: () => setLocale(locale === "en" ? "ar" : "en"),
      t: (key, params) => translate(locale, key, params),
      n: (v, decimals) => formatNumber(locale, v, decimals),
      d: (iso, opts) => formatDate(locale, iso, opts),
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
