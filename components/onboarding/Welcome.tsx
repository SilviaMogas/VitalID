"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { LogoMark } from "@/components/layout/Logo";
import { Broccoli } from "@/components/mascot/Broccoli";
import { Apple, Avocado, Banana } from "@/components/mascot/Crew";
import { CredentialCard } from "@/components/vital-id/CredentialCard";
import { DEMO_EMERGENCY, DEMO_IDENTITY } from "@/lib/demo-data";
import { DemoBadge } from "@/components/layout/DemoBadge";
import { LegalLinks } from "@/components/legal/LegalLinks";

/** Set NEXT_PUBLIC_DEMO_LOGIN=0 to hide the instant demo login (e.g. production). */
const DEMO_LOGIN_ENABLED = process.env.NEXT_PUBLIC_DEMO_LOGIN !== "0";

export function Welcome({
  onEnter,
  onContinue,
  continueName,
  onAuthLink,
}: {
  onEnter: () => void;
  onContinue?: () => void;
  continueName?: string;
  onAuthLink?: () => void;
}) {
  const { t, toggleLocale, locale } = useLocale();

  const Arrow = () => <span className="inline-block rtl:-scale-x-100">→</span>;

  return (
    <div className="min-h-dvh md:grid md:grid-cols-2">
      {/* auth side */}
      <div className="relative flex min-h-dvh flex-col px-6 pb-8 pt-6 md:min-h-0 md:px-14 md:pt-10 lg:px-20">
        <header className="flex items-center justify-between">
          <div className="pop flex items-center gap-2.5" style={{ ["--i" as string]: 0 }}>
            <LogoMark size={40} />
            <span className="leading-tight">
              <span className="block text-lg font-semibold tracking-tight text-brand">{t("app.name")}</span>
              <span className="block text-xs text-muted">{t("app.tagline")}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={toggleLocale}
            aria-label={t("lang.label")}
            lang={locale === "en" ? "ar" : "en"}
            className="press rounded-full border border-line bg-white/80 px-3.5 py-1.5 text-sm font-medium text-ink-2"
          >
            {t("lang.switch")}
          </button>
        </header>

        <div className="my-auto max-w-sm py-12">
          <h1 className="rise text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl" style={{ ["--i" as string]: 1 }}>
            {t("onboarding.welcome")}
          </h1>
          <p className="rise mt-3 text-base text-ink-2" style={{ ["--i" as string]: 2 }}>
            {t("onboarding.welcomeSub")}
          </p>

          <div className="mt-8 space-y-3">
            {onContinue && (
              <button
                type="button"
                onClick={onContinue}
                className="rise press flex w-full items-center justify-between rounded-2xl bg-brand-deep px-5 py-3.5 text-sm font-semibold text-white shadow-hero hover:bg-brand"
                style={{ ["--i" as string]: 2.5 }}
              >
                {t("onboarding.continueAs", { name: continueName ?? "" })} <Arrow />
              </button>
            )}
            <Link
              href="/signup"
              onClick={onAuthLink}
              className="rise press flex w-full items-center justify-between rounded-2xl bg-brand px-5 py-3.5 text-sm font-semibold text-white shadow-hero hover:bg-brand-deep"
              style={{ ["--i" as string]: 3 }}
            >
              {t("onboarding.signUp")} <Arrow />
            </Link>
            <Link
              href="/signin"
              onClick={onAuthLink}
              className="rise press flex w-full items-center justify-between rounded-2xl border border-brand/40 bg-white px-5 py-3.5 text-sm font-semibold text-brand hover:bg-sage"
              style={{ ["--i" as string]: 4 }}
            >
              {t("onboarding.signIn")} <Arrow />
            </Link>
            {DEMO_LOGIN_ENABLED && (
              <button
                type="button"
                onClick={onEnter}
                className="rise press flex w-full items-center justify-between rounded-2xl bg-brand-soft px-5 py-3.5 text-sm font-semibold text-brand-deep ring-1 ring-brand/15 hover:bg-mint/60"
                style={{ ["--i" as string]: 5 }}
              >
                <span className="flex items-center gap-2.5">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-[11px] font-bold text-white" dir="ltr">
                    F
                  </span>
                  {t("onboarding.demoCta")}
                  <DemoBadge />
                </span>
                <Arrow />
              </button>
            )}
          </div>
          {DEMO_LOGIN_ENABLED && (
            <p className="rise mt-3 text-sm text-muted" style={{ ["--i" as string]: 6 }}>
              {t("onboarding.demoHint")}
            </p>
          )}
        </div>

        <footer className="rise flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted" style={{ ["--i" as string]: 7 }}>
          <span>{t("onboarding.foot.privacy")}</span>
          <span aria-hidden>·</span>
          <LegalLinks />
          <span aria-hidden>·</span>
          <span>{t("onboarding.foot.demo")}</span>
        </footer>
      </div>

      {/* preview side (desktop) */}
      <div className="relative hidden overflow-hidden bg-sage md:flex md:items-center md:justify-center">
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 400 800">
          <path d="M-40 620 C 100 520, 220 700, 440 560 L 440 820 L -40 820 Z" fill="#b7e4c7" opacity="0.45" />
          <ellipse cx="330" cy="120" rx="170" ry="140" fill="#ffffff" opacity="0.5" />
          <path d="M60 90 c 20 -50 90 -50 90 10 c -50 20 -80 10 -90 -10 z" fill="#b7e4c7" opacity="0.7" className="anim-leaf o-bottom" />
        </svg>

        <div className="relative w-[min(420px,80%)]">
          <div className="pop" style={{ ["--i" as string]: 3 }}>
            <div className="anim-float rotate-[-3deg]">
              <CredentialCard identity={DEMO_IDENTITY} emergencyInfo={DEMO_EMERGENCY} compact className="shadow-lift" />
            </div>
          </div>
          <div className="pop absolute -bottom-16 -start-24" style={{ ["--i" as string]: 5 }}>
          <Broccoli className="anim-float" state="happy" size={110} />
        </div>
          <div className="pop absolute -end-6 -top-12" style={{ ["--i" as string]: 6 }}>
          <Apple className="anim-float" size={64} />
        </div>
          <div className="pop absolute -end-10 bottom-6" style={{ ["--i" as string]: 7 }}>
          <Banana className="anim-float" size={60} />
        </div>
          <div className="pop absolute -top-6 start-10" style={{ ["--i" as string]: 8 }}>
          <Avocado className="anim-float" size={48} />
        </div>
          <p
            className="rise absolute -bottom-24 end-0 text-lg italic text-brand-deep/80"
            style={{ ["--i" as string]: 8, fontFamily: "Georgia, 'Noto Naskh Arabic', serif" }}
          >
            {t("onboarding.previewTag")}
          </p>
        </div>
      </div>
    </div>
  );
}
