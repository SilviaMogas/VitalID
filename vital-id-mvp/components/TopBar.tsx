"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearLocalJourney } from "@/lib/accountClient";
import { getItem, STORAGE_KEYS } from "@/lib/storage";
import { useLang } from "@/app/providers";

export default function TopBar() {
  const { lang, setLang, t, a11y, toggleA11y } = useLang();
  const path = usePathname();
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const profile = getItem<{ isDemo?: boolean }>(STORAGE_KEYS.profile);
    setSignedIn(profile?.isDemo === false);
  }, [path]);
  const signOut = async () => {
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
    clearLocalJourney();
    setSignedIn(false);
    router.push("/register");
  };
  return (
    <header className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--line)" }}>
      <Link href="/" className="flex items-center gap-2 font-bold text-xl" style={{ color: "var(--accent)" }} aria-label="Vita Lady home">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <rect x="3" y="5" width="26" height="22" rx="4" stroke="currentColor" strokeWidth="2.4" />
          <path
            d="M16 22c-3.6-2.6-6-4.7-6-7.4 0-1.9 1.4-3.1 3-3.1 1.2 0 2.3.7 3 1.8.7-1.1 1.8-1.8 3-1.8 1.6 0 3 1.2 3 3.1 0 2.7-2.4 4.8-6 7.4z"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        </svg>
        {t("app.name")}
      </Link>
      <div className="flex items-center gap-2">
        {signedIn && <button type="button" className="btn btn-outline" onClick={signOut} aria-label={lang === "ar" ? "تسجيل الخروج" : "Sign out"} title={lang === "ar" ? "تسجيل الخروج" : "Sign out"}>↪</button>}
        <button
          onClick={toggleA11y}
          className="btn btn-outline"
          style={{ minHeight: 48, minWidth: 48, padding: "0.5rem 0.75rem", fontWeight: 800 }}
          aria-pressed={a11y}
          aria-label={t("a11y.toggle")}
          title={t("a11y.toggle")}
          data-testid="a11y-toggle"
        >
          Aa
        </button>
        <button
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          className="btn btn-outline"
          style={{ minHeight: 48, padding: "0.5rem 1rem" }}
          aria-label="Toggle language"
        >
          {t("lang.toggle")}
        </button>
      </div>
    </header>
  );
}
