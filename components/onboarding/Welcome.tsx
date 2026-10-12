"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { LogoMark } from "@/components/layout/Logo";
import { WellnessRibbon } from "@/components/mascot/WellnessArt";
import { CredentialCard } from "@/components/vital-id/CredentialCard";
import { DEMO_EMERGENCY, DEMO_IDENTITY } from "@/lib/demo-data";
import { DemoBadge } from "@/components/layout/DemoBadge";
import { LegalLinks } from "@/components/legal/LegalLinks";

/** Instant demo login is OFF by default — set NEXT_PUBLIC_DEMO_LOGIN=1 to enable it. */
const DEMO_LOGIN_ENABLED = process.env.NEXT_PUBLIC_DEMO_LOGIN === "1";

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
    <div className="min-h-dvh bg-white md:grid md:grid-cols-2">
      {/* auth side */}
      <div className="relative flex min-h-dvh flex-col px-6 pb-8 pt-6 md:min-h-0 md:px-12 md:pt-10 lg:px-20">
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

        <div className="my-auto w-full max-w-lg py-14">
          <p className="rise mb-5 text-sm font-semibold text-brand">{t("onboarding.welcome")}</p>
          <h1 className="rise text-[3rem] font-semibold leading-[1.04] tracking-[-0.055em] lg:text-[4rem]" style={{ ["--i" as string]: 1 }}>
            {t("onboarding.healthHeadline")}
            <span className="mt-1 block text-brand">{t("onboarding.controlHeadline")}</span>
          </h1>
          <p className="rise mt-6 max-w-sm text-lg leading-relaxed text-muted" style={{ ["--i" as string]: 2 }}>
            {t("onboarding.healthIntro")}
          </p>
          <div className="mt-6 md:hidden"><WellnessRibbon compact /></div>

          <div className="mt-8 max-w-sm space-y-3">
            {onContinue && (
              <button
                type="button"
                onClick={onContinue}
                className="rise press flex w-full items-center justify-between rounded-full bg-brand-deep px-6 py-3.5 text-sm font-semibold text-white hover:bg-brand"
                style={{ ["--i" as string]: 2.5 }}
              >
                {t("onboarding.continueAs", { name: continueName ?? "" })} <Arrow />
              </button>
            )}
            <Link
              href="/signup"
              onClick={onAuthLink}
              className="rise press flex w-full items-center justify-between rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-white hover:bg-brand-deep"
              style={{ ["--i" as string]: 3 }}
            >
              {t("onboarding.signUp")} <Arrow />
            </Link>
            <Link
              href="/signin"
              onClick={onAuthLink}
              className="rise press flex w-full items-center justify-between rounded-full border border-line bg-white px-6 py-3.5 text-sm font-semibold text-ink hover:bg-canvas"
              style={{ ["--i" as string]: 4 }}
            >
              {t("onboarding.signIn")} <Arrow />
            </Link>
            {DEMO_LOGIN_ENABLED && (
              <button
                type="button"
                onClick={onEnter}
                className="rise press flex w-full items-center justify-between rounded-full bg-brand-soft px-5 py-3.5 text-sm font-semibold text-brand-deep hover:bg-sage"
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
      <div className="hidden bg-canvas p-8 md:flex md:items-center md:justify-center lg:p-16">
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-[2.5rem] border border-white bg-white/65 p-5 shadow-lift lg:p-7">
            <div className="mb-5 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">{t("vitalId.cardLabel")}</span>
              <DemoBadge />
            </div>
            <CredentialCard identity={DEMO_IDENTITY} emergencyInfo={DEMO_EMERGENCY} compact />
            <div className="mt-6"><WellnessRibbon compact /></div>
            <p className="mt-5 text-center text-xs text-muted">{t("onboarding.foot.demo")}</p>
          </div>
          <p className="text-center text-lg font-medium tracking-tight text-ink-2">
            {t("onboarding.previewTag")}
          </p>
        </div>
      </div>
    </div>
  );
}
