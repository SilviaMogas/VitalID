"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { SectionTitle } from "@/components/vital-id/VitalIdSections";
import { MascotNote } from "@/components/mascot/MascotNote";
import { CoachChat } from "./CoachChat";
import { WellnessArt, type WellnessKind } from "@/components/mascot/WellnessArt";
import { COACH_AREAS, type CoachArea, type Recommendation } from "@/lib/coach";
import type { TranslationKey } from "@/lib/i18n";
import type { GoalId } from "@/lib/onboarding/types";
import type { DataOwner } from "@/lib/user-data";
import type { HealthMetric, Identity } from "@/types";

const AREA_STYLE: Record<CoachArea, { chip: string }> = {
  activity: { chip: "bg-brand-soft text-brand" },
  nutrition: { chip: "bg-sage text-brand-deep" },
  sleep: { chip: "bg-brand-soft text-brand-deep" },
  progress: { chip: "bg-mint text-brand-deep" },
  mood: { chip: "bg-peach/50 text-ink-2" },
  lifestyle: { chip: "bg-sand text-ink-2" },
};
const AREA_ART: Record<CoachArea, WellnessKind> = {
  activity: "movement", nutrition: "nutrition", sleep: "sleep",
  progress: "health", mood: "meditation", lifestyle: "hydration",
};

function AreaIcon({ area, className = "h-5 w-5" }: { area: CoachArea; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    className,
  } as const;
  switch (area) {
    case "activity":
      return (
        <svg {...common}>
          <path d="M4 14l4-7 4 5 3-3 5 5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 19h16" strokeLinecap="round" />
        </svg>
      );
    case "nutrition":
      return (
        <svg {...common}>
          <path d="M12 20c-4 0-6.5-2.5-6.5-6C5.5 9 9 5.5 18.5 4c-1 9.5-2.5 16-6.5 16z" strokeLinejoin="round" />
          <path d="M7 17c2-4 5-7 8-9" strokeLinecap="round" />
        </svg>
      );
    case "sleep":
      return (
        <svg {...common}>
          <path d="M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5z" strokeLinejoin="round" />
        </svg>
      );
    case "progress":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5v4.5l3 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "mood":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8" strokeLinecap="round" />
          <path d="M9 9.6h.01M15 9.6h.01" strokeLinecap="round" strokeWidth="2.4" />
        </svg>
      );
    case "lifestyle":
      return (
        <svg {...common}>
          <path d="M5 6h9M19 6h0M5 12h3M13 12h6M5 18h9" strokeLinecap="round" />
          <circle cx="16.5" cy="6" r="2" />
          <circle cx="10.5" cy="12" r="2" />
          <circle cx="16.5" cy="18" r="2" />
        </svg>
      );
  }
}

/** Params like {goal}/{metric} hold ids — translate them before rendering the template. */
export function CoachView({
  recommendations,
  metrics,
  goals,
  identity,
  owner,
}: {
  recommendations: Recommendation[];
  metrics: HealthMetric[];
  goals: GoalId[];
  identity: Identity;
  owner: DataOwner;
}) {
  const { t, locale } = useLocale();
  const firstName = (identity.localizedName?.[locale] ?? identity.fullName).split(" ")[0];

  const translateParams = (params: Record<string, string | number>) =>
    Object.fromEntries(
      Object.entries(params).map(([k, v]) => {
        if (k === "goal") return [k, t(`setup.goal.${v}` as TranslationKey)];
        if (k === "metric") return [k, t(`metric.${v}` as TranslationKey)];
        return [k, v];
      }),
    );

  return (
    <div className="space-y-7">
      <CoachChat
        firstName={firstName}
        metrics={metrics}
        recommendations={recommendations}
        translateParams={translateParams}
      />

      <section className="rise pt-6" style={{ ["--i" as string]: 1 }}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="display text-3xl">{t("chat.fullPlan")}</h2>
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
            {t("coach.badge")}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">{t("coach.subtitle")}</p>
      </section>

      <section className="rise" style={{ ["--i" as string]: 2 }}>
        <SectionTitle>{t("coach.inputs")}</SectionTitle>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {COACH_AREAS.map((area) => (
            <div key={area} className="card flex flex-col items-start gap-2.5 p-4">
              <WellnessArt kind={AREA_ART[area]} size={46} />
              <span className="text-xs font-medium leading-snug text-ink-2">
                {t(`coach.area.${area}` as TranslationKey)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink-2">{t("coach.yourGoals")}</span>
          {goals.length === 0 ? (
            owner === "fatima" ? (
              <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-deep">
                {t("coach.demoGoals")}
              </span>
            ) : (
              <Link
                href="/onboarding?step=2"
                className="press rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-white"
              >
                {t("coach.addGoals")}
              </Link>
            )
          ) : (
            goals.map((g) => (
              <span
                key={g}
                className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-deep"
              >
                {t(`setup.goal.${g}` as TranslationKey)}
              </span>
            ))
          )}
        </div>
      </section>

      <section className="rise" style={{ ["--i" as string]: 3 }}>
        <SectionTitle>{t("coach.recommendations")}</SectionTitle>
        <ul className="mt-3 space-y-2.5">
          {recommendations.map((rec, i) => {
            const body = (
              <>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${AREA_STYLE[rec.area].chip}`}>
                  <AreaIcon area={rec.area} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-snug">
                    {t(rec.key as TranslationKey, translateParams(rec.params))}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {t(rec.reasonKey as TranslationKey, translateParams(rec.reasonParams))}
                  </span>
                </span>
                <span aria-hidden className="shrink-0 text-muted rtl:-scale-x-100">→</span>
              </>
            );
            const cls = `card lift rise flex items-center gap-3 p-4`;
            return (
              <li key={rec.id} className="rise" style={{ ["--i" as string]: 3 + i }}>
                {rec.metric ? (
                  <Link href={`/trends?metric=${rec.metric}`} className={`${cls} press block`}>
                    {body}
                  </Link>
                ) : (
                  <div className={cls}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="rise space-y-4" style={{ ["--i" as string]: 10 }}>
        <p className="text-xs leading-snug text-muted">{t("coach.notMedical")}</p>
        <div className="mb-2 flex justify-center">
          <MascotNote state="encouraging" size={48}>
            {t("mascot.coach")}
          </MascotNote>
        </div>
      </div>
    </div>
  );
}
