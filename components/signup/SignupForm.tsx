"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";

export function SignupForm() {
  const { t, toggleLocale, locale } = useLocale();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/membership/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      window.localStorage.setItem("vitalid.session", "member");
      router.push("/pricing?onboarding=1");
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5">
              <path d="M3 12h4l2.5-6 4 12 2.5-6H21" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-base font-semibold tracking-tight">{t("app.name")}</span>
        </div>
        <button
          type="button"
          onClick={toggleLocale}
          aria-label={t("lang.label")}
          lang={locale === "en" ? "ar" : "en"}
          className="rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-medium text-ink-2 shadow-sm transition hover:bg-canvas"
        >
          {t("lang.switch")}
        </button>
      </header>

      <main className="mt-10">
        <h1 className="text-2xl font-semibold tracking-tight">{t("signup.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("signup.subtitle")}</p>

        <form onSubmit={submit} className="card mt-6 space-y-4 p-5">
          <div>
            <label htmlFor="signup-name" className="mb-1 block text-xs font-medium text-ink-2">
              {t("signup.name")}
            </label>
            <input
              id="signup-name"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={input}
              autoComplete="name"
            />
          </div>
          <div>
            <label htmlFor="signup-email" className="mb-1 block text-xs font-medium text-ink-2">
              {t("signup.email")}
            </label>
            <input
              id="signup-email"
              type="email"
              required
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={input}
              autoComplete="email"
            />
          </div>
          {error && <p className="text-sm text-bad">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-brand py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-ink disabled:opacity-50"
          >
            {busy ? t("common.loading") : t("signup.continue")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/" className="font-medium text-brand">
            {t("signup.exploreDemo")}
          </Link>
        </p>
      </main>
    </div>
  );
}
