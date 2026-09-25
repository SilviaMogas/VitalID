"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { PremiumShowcase } from "@/components/membership/PremiumShowcase";
import type { VitalIdSnapshot } from "@/types";
import { CredentialCard } from "@/components/vital-id/CredentialCard";
import { MascotNote } from "@/components/mascot/MascotNote";
import {
  EmergencySection,
  HealthProfileSection,
  SectionTitle,
  SignalsSection,
  SourcePills,
  TrendsSection,
} from "@/components/vital-id/VitalIdSections";

const SIGNAL_KEYS = ["recovery", "hrv", "sleep"] as const;

export function VitalIdView({ snapshot }: { snapshot: VitalIdSnapshot }) {
  const { t } = useLocale();
  const { identity, emergencyInfo, healthProfile } = snapshot;
  const signals = snapshot.currentSignals.filter((m) =>
    (SIGNAL_KEYS as readonly string[]).includes(m.metric),
  );

  return (
    <div className="space-y-5">
      <section className="rise" style={{ ["--i" as string]: 0 }}>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("vitalId.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("vitalId.subtitle")}</p>
      </section>

      {/* Hero credential */}
      <div className="rise" style={{ ["--i" as string]: 1 }}>
        <CredentialCard identity={identity} emergencyInfo={emergencyInfo} />
      </div>

      {/* Emergency information */}
      <div className="rise" style={{ ["--i" as string]: 2 }}>
        <EmergencySection info={emergencyInfo} />
      </div>

      {/* Current signals */}
      <div className="rise" style={{ ["--i" as string]: 3 }}>
        <SignalsSection signals={signals} />
      </div>

      {/* Recent trends */}
      <div className="rise" style={{ ["--i" as string]: 4 }}>
        <TrendsSection insights={snapshot.recentTrends} />
      </div>

      {/* Health profile */}
      <div className="rise" style={{ ["--i" as string]: 5 }}>
        <HealthProfileSection profile={healthProfile} />
      </div>

      {/* Membership plan showcase */}
      <PremiumShowcase />

      {/* Data sources + last updated */}
      <div className="rise" style={{ ["--i" as string]: 6 }}>
        <div className="surface p-5">
          <div className="flex items-center justify-between gap-4">
            <SectionTitle>{t("vitalId.dataSources")}</SectionTitle>
            <span className="text-[11px] text-muted">
              {t("vitalId.lastUpdated")}: {t("vitalId.today")}
            </span>
          </div>
          <SourcePills sources={snapshot.sources} />
        </div>
      </div>

      {/* Share CTA */}
      <div className="rise" style={{ ["--i" as string]: 7 }}>
        <div className="mb-4 flex justify-center">
          <MascotNote state="neutral" size={48}>
            {t("mascot.vitalId")}
          </MascotNote>
        </div>
        <Link
          href="/share"
          className="press block w-full rounded-2xl bg-brand py-3.5 text-center text-sm font-semibold text-white shadow-lift transition hover:bg-brand-deep"
        >
          {t("vitalId.shareCta")}
        </Link>
        <p className="mt-2 text-center text-xs text-muted">{t("vitalId.shareHint")}</p>
      </div>
    </div>
  );
}
