"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useMembership } from "@/components/providers/MembershipProvider";
import { PlanBadge } from "@/components/membership/PlanBadge";
import { HelpButton, LangButton } from "@/components/layout/AppShell";
import { PaintedPath } from "@/components/dashboard/HomeHero";
import { CONNECTORS_STORAGE_KEY } from "@/lib/connectors-state";
import { HEALTH_CONSENT_STORAGE_KEY } from "@/lib/legal";
import type { TranslationKey } from "@/lib/i18n";

const ICON = "h-7 w-7";

const ROWS: { href: string; title: TranslationKey; sub: TranslationKey; icon: ReactNode }[] = [
  {
    href: "/focus",
    title: "focus.title",
    sub: "more.focus.sub",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={ICON}>
        <circle cx="12" cy="13" r="7.5" />
        <path d="M12 9v4l2.5 2M10 3h4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/connectors",
    title: "nav.connectors",
    sub: "more.connectors.sub",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={ICON}>
        <circle cx="7.5" cy="7.5" r="3" />
        <circle cx="16.5" cy="7.5" r="3" />
        <circle cx="7.5" cy="16.5" r="3" />
        <circle cx="16.5" cy="16.5" r="3" />
      </svg>
    ),
  },
  {
    href: "/share",
    title: "nav.share",
    sub: "more.share.sub",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={ICON}>
        <circle cx="18" cy="5.5" r="2.5" />
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="18.5" r="2.5" />
        <path d="M8.2 10.8 15.8 6.7M8.2 13.2l7.6 4.1" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/community",
    title: "nav.community",
    sub: "more.community.sub",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={ICON}>
        <circle cx="9" cy="8.5" r="3" />
        <path d="M3.5 19c.6-3 2.8-5 5.5-5s4.9 2 5.5 5" strokeLinecap="round" />
        <circle cx="17" cy="9.5" r="2.4" />
        <path d="M16.2 14.3c2.4.2 4 1.9 4.3 4.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/coach",
    title: "nav.coach",
    sub: "more.coach.sub",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={ICON}>
        <path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 16.5h-7l-4.5 3.5v-3.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5z" strokeLinejoin="round" />
        <path d="M9 10.5h.01M12 10.5h.01M15 10.5h.01" strokeLinecap="round" strokeWidth="2.4" />
      </svg>
    ),
  },
];

const INTRO_KEYS = ["home", "trends", "vitalId", "more", "coach"];

export function MoreView() {
  const { t } = useLocale();
  const router = useRouter();
  const { status, signOut: authSignOut } = useAuth();
  const { refresh: refreshMembership } = useMembership();
  const [settingsOpen, setSettingsOpen] = useState(false);

  function replayTour() {
    try {
      INTRO_KEYS.forEach((k) => window.localStorage.removeItem(`vitalid.intro.${k}`));
    } catch {
      /* storage unavailable — intros simply won't replay */
    }
    router.push("/");
  }

  function signOut() {
    try {
      window.localStorage.removeItem(CONNECTORS_STORAGE_KEY);
      window.localStorage.removeItem(HEALTH_CONSENT_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    router.push("/welcome");
    void authSignOut().then(() => void refreshMembership());
  }

  return (
    <div className="space-y-8">
      <header className="rise flex items-center justify-between" style={{ ["--i" as string]: 0 }}>
        <h1 className="display text-5xl">{t("more.title")}</h1>
        <HelpButton className="hidden md:grid" />
      </header>

      <button
        type="button"
        onClick={replayTour}
        className="rise lift press relative block aspect-[16/9] w-full overflow-hidden rounded-[2rem] text-start shadow-lift"
        style={{ ["--i" as string]: 1 }}
      >
        <PaintedPath className="absolute inset-0 h-full w-full scale-125 object-cover blur-[1.5px]" />
        <span className="absolute inset-0 bg-gradient-to-b from-transparent via-ink/10 to-ink/75" />
        <span className="absolute inset-x-6 bottom-6 flex items-end justify-between gap-4 text-white">
          <span>
            <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-white/85">
              {t("more.hero.eyebrow")}
            </span>
            <span className="display mt-1 block text-5xl">{t("more.hero.title")}</span>
          </span>
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/20 text-2xl backdrop-blur rtl:-scale-x-100">
            →
          </span>
        </span>
      </button>

      <ul className="rise divide-y divide-line" style={{ ["--i" as string]: 2 }}>
        {ROWS.map((row) => (
          <li key={row.href}>
            <Link href={row.href} className="press flex items-center gap-5 py-5">
              <span className="text-ink-2">{row.icon}</span>
              <span className="min-w-0">
                <span className="display block text-3xl leading-tight text-ink">{t(row.title)}</span>
                <span className="mt-0.5 block text-base text-muted">{t(row.sub)}</span>
              </span>
            </Link>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => setSettingsOpen((o) => !o)}
            aria-expanded={settingsOpen}
            className="press flex w-full items-center gap-5 py-5 text-start"
          >
            <span className="text-ink-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={ICON}>
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2.8l1.6 2.4 2.8-.6.6 2.8 2.4 1.6-1.2 2.6 1.2 2.6-2.4 1.6-.6 2.8-2.8-.6L12 21.2l-1.6-2.4-2.8.6-.6-2.8-2.4-1.6L5.8 12 4.6 9.4 7 7.8l.6-2.8 2.8.6z" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="display block text-3xl leading-tight text-ink">{t("more.settings")}</span>
              <span className="mt-0.5 block text-base text-muted">{t("more.settings.sub")}</span>
            </span>
            <span aria-hidden className={`text-xl text-muted transition ${settingsOpen ? "rotate-90" : "rtl:-scale-x-100"}`}>›</span>
          </button>
          {settingsOpen && (
            <div className="soft-card mb-5 space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-ink-2">{t("more.plan")}</span>
                <span className="flex items-center gap-2">
                  <PlanBadge />
                  <Link href="/pricing" className="text-sm font-semibold text-brand">
                    {t("setup.changePlan")}
                  </Link>
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-ink-2">{t("more.language")}</span>
                <LangButton />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-ink-2">{t("legal.links")}</span>
                <span className="flex items-center gap-3 text-sm font-semibold text-brand">
                  <Link href="/privacy">{t("legal.privacy")}</Link>
                  <Link href="/terms">{t("legal.terms")}</Link>
                </span>
              </div>
              {status === "member" && (
                <Link href="/onboarding?step=1" className="press block rounded-2xl bg-sage px-4 py-3 text-sm font-semibold text-brand">
                  {t("more.editSetup")}
                </Link>
              )}
              <button
                type="button"
                onClick={signOut}
                className="press w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-bad"
              >
                {t("auth.signOut")}
              </button>
            </div>
          )}
        </li>
      </ul>
    </div>
  );
}
