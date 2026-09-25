"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useMembership } from "@/components/providers/MembershipProvider";
import { LogoMark } from "@/components/layout/Logo";
import { Broccoli } from "@/components/mascot/Broccoli";
import type { TranslationKey } from "@/lib/i18n";

const STEPS: { icon: string; titleKey: TranslationKey; descKey: TranslationKey }[] = [
  { icon: "🔗", titleKey: "setup.step.connect.title", descKey: "setup.step.connect.desc" },
  { icon: "🎯", titleKey: "setup.step.share.title", descKey: "setup.step.share.desc" },
  { icon: "🛡️", titleKey: "setup.step.control.title", descKey: "setup.step.control.desc" },
];

/** Minimal 3-step intro shown after plan selection (free or paid). */
export function OnboardingSetup() {
  const { t, toggleLocale, locale } = useLocale();
  const router = useRouter();
  const { refresh } = useMembership();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/membership/onboarding/complete", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await refresh();
      router.push("/");
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LogoMark size={34} />
          <span className="text-base font-semibold tracking-tight text-brand">{t("app.name")}</span>
        </div>
        <button
          type="button"
          onClick={toggleLocale}
          aria-label={t("lang.label")}
          lang={locale === "en" ? "ar" : "en"}
          className="press rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-medium text-ink-2"
        >
          {t("lang.switch")}
        </button>
      </header>

      <main className="my-auto py-8">
        <div className="flex justify-center">
          <Broccoli state="happy" size={88} className="anim-float" />
        </div>
        <h1 className="mt-5 text-center text-2xl font-semibold tracking-tight">{t("setup.title")}</h1>
        <p className="mt-2 text-center text-sm text-muted">{t("setup.subtitle")}</p>

        <ol className="mt-8 space-y-3">
          {STEPS.map((step, i) => (
            <li key={step.titleKey} className="card flex items-start gap-3 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-lg">
                <span aria-hidden>{step.icon}</span>
              </span>
              <div>
                <p className="text-sm font-semibold">
                  <span className="me-1.5 text-xs text-muted">{i + 1}.</span>
                  {t(step.titleKey)}
                </p>
                <p className="mt-0.5 text-xs text-muted">{t(step.descKey)}</p>
              </div>
            </li>
          ))}
        </ol>

        {error && <p className="mt-4 text-center text-sm text-bad">{error}</p>}

        <button
          type="button"
          onClick={finish}
          disabled={busy}
          className="press mt-8 w-full rounded-2xl bg-brand py-3.5 text-sm font-semibold text-white shadow-hero transition hover:bg-brand-deep disabled:opacity-50"
        >
          {busy ? t("common.loading") : t("setup.finish")}
        </button>
      </main>
    </div>
  );
}
