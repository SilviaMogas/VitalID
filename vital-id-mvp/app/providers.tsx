"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { translate, type DictKey, type Lang } from "@/lib/i18n";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
  dir: "rtl" | "ltr";
  a11y: boolean;
  toggleA11y: () => void;
}

const Ctx = createContext<LangCtx>({
  lang: "ar",
  setLang: () => {},
  t: (k) => k,
  dir: "rtl",
  a11y: false,
  toggleA11y: () => {},
});

export function useLang() {
  return useContext(Ctx);
}

export function Providers({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");
  const [a11y, setA11y] = useState(false);

  useEffect(() => {
    const saved = getItem<Lang>(STORAGE_KEYS.lang);
    if (saved === "en" || saved === "ar") setLangState(saved);
    setA11y(getItem<boolean>(STORAGE_KEYS.a11y) === true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  useEffect(() => {
    if (a11y) document.documentElement.setAttribute("data-a11y", "1");
    else document.documentElement.removeAttribute("data-a11y");
  }, [a11y]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setItem(STORAGE_KEYS.lang, l);
  }, []);

  const toggleA11y = useCallback(() => {
    setA11y((v) => {
      setItem(STORAGE_KEYS.a11y, !v);
      return !v;
    });
  }, []);

  const t = useCallback(
    (key: DictKey, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang]
  );

  return (
    <Ctx.Provider value={{ lang, setLang, t, dir: lang === "ar" ? "rtl" : "ltr", a11y, toggleA11y }}>
      {children}
    </Ctx.Provider>
  );
}
