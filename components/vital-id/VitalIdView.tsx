"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n";
import type { VitalIdSnapshot } from "@/types";
import {
  EmergencySection,
  HealthProfileSection,
  SectionTitle,
  SignalsSection,
  SourcePills,
  TrendsSection,
} from "@/components/vital-id/VitalIdSections";

const SIGNAL_KEYS = ["recovery", "hrv", "sleep"] as const;

function Field({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-white/50">{label}</p>
      <p className="mt-0.5 text-sm font-medium" dir={ltr ? "ltr" : undefined}>
        {value}
      </p>
    </div>
  );
}

export function VitalIdView({ snapshot }: { snapshot: VitalIdSnapshot }) {
  const { t, d, locale } = useLocale();
  const { identity, emergencyInfo, healthProfile } = snapshot;
  const signals = snapshot.currentSignals.filter((m) =>
    (SIGNAL_KEYS as readonly string[]).includes(m.metric),
  );

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("vitalId.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("vitalId.subtitle")}</p>
      </section>

      {/* Hero identity card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink via-[#0d2436] to-[#0b3f3a] p-6 text-white shadow-lg md:p-8">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full opacity-20"
          preserveAspectRatio="none"
          viewBox="0 0 400 200"
        >
          <path d="M-20 140 C 60 90, 120 190, 200 140 S 340 90, 420 150" fill="none" stroke="#5eead4" strokeWidth="1.5" />
          <path d="M-20 160 C 70 120, 140 210, 220 160 S 350 110, 420 170" fill="none" stroke="#5eead4" strokeWidth="1" opacity="0.6" />
          <circle cx="330" cy="50" r="60" fill="#0f766e" opacity="0.35" />
        </svg>

        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-base font-bold">
                V
              </span>
              <span className="text-xs font-semibold uppercase tracking-widest text-white/70">
                {t("vitalId.cardLabel")}
              </span>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wide ring-1 ring-white/25" dir="ltr">
              {emergencyInfo.bloodType}
            </span>
          </div>

          <p className="mt-6 text-[10px] uppercase tracking-widest text-white/50">{t("vitalId.holder")}</p>
          <p className="mt-0.5 text-2xl font-semibold tracking-tight md:text-3xl">{identity.localizedName?.[locale] ?? identity.fullName}</p>
          <p className="tabular mt-2 font-mono text-sm tracking-widest text-brand-soft" dir="ltr">
            {identity.vitalId}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-white/15 pt-4">
            <Field label={t("vitalId.dob")} value={d(identity.dateOfBirth, { year: "numeric" })} ltr />
            <Field
              label={t("vitalId.sex")}
              value={t(`vitalId.sex.${identity.sex}` as TranslationKey)}
            />
            <Field
              label={t("vitalId.nationality")}
              value={t(`vitalId.nationality.${identity.nationality}` as TranslationKey)}
            />
          </div>
        </div>
      </div>

      {/* Emergency information */}
      <EmergencySection info={emergencyInfo} />

      {/* Current signals */}
      <SignalsSection signals={signals} />

      {/* Recent trends */}
      <TrendsSection insights={snapshot.recentTrends} />

      {/* Health profile */}
      <HealthProfileSection profile={healthProfile} />

      {/* Data sources + last updated */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-4">
          <SectionTitle>{t("vitalId.dataSources")}</SectionTitle>
          <span className="text-[11px] text-muted">
            {t("vitalId.lastUpdated")}: {t("vitalId.today")}
          </span>
        </div>
        <SourcePills sources={snapshot.sources} />
      </div>

      {/* Share CTA */}
      <div>
        <Link
          href="/share"
          className="block w-full rounded-2xl bg-brand py-3.5 text-center text-sm font-semibold text-white shadow-md transition hover:bg-ink"
        >
          {t("vitalId.shareCta")}
        </Link>
        <p className="mt-2 text-center text-xs text-muted">{t("vitalId.shareHint")}</p>
      </div>
    </div>
  );
}
