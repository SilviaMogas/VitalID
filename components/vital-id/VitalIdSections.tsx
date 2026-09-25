"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n";
import { METRIC_META } from "@/lib/demo-data";
import type { DataSource, EmergencyInfo, HealthMetric, HealthProfile, Insight } from "@/types";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { isWorse, statusTone } from "@/components/dashboard/MetricCard";

export function SectionTitle({ children }: { children: string }) {
  return <h2 className="eyebrow">{children}</h2>;
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-end text-sm font-medium">{children}</span>
    </div>
  );
}

export function EmergencySection({ info }: { info: EmergencyInfo }) {
  const { t, locale } = useLocale();
  const listSep = locale === "ar" ? "، " : ", ";
  return (
    <div className="rounded-[1.25rem] border border-peach/60 bg-sand p-5">
      <SectionTitle>{t("vitalId.emergency")}</SectionTitle>
      <div className="mt-3 divide-y divide-line">
        <Row label={t("vitalId.bloodType")}>
          <span className="rounded-full bg-bad-soft px-2.5 py-0.5 text-xs font-bold text-bad" dir="ltr">
            {info.bloodType}
          </span>
        </Row>
        <Row label={t("vitalId.allergies")}>
          {info.allergies.length === 0
            ? t("vitalId.none")
            : info.allergies
                .map((a) => t(`vitalId.allergy.${a}` as TranslationKey))
                .join(listSep)}
        </Row>
        <Row label={t("vitalId.conditions")}>
          {info.conditions.length === 0 ? t("vitalId.none") : info.conditions.join(listSep)}
        </Row>
        <Row label={t("vitalId.emergencyContact")}>
          <span>
            {info.emergencyContact.localizedName?.[locale] ?? info.emergencyContact.name} ·{" "}
            {t(`vitalId.relation.${info.emergencyContact.relation}` as TranslationKey)}
            <br />
            <span className="tabular text-muted" dir="ltr">
              {info.emergencyContact.phone}
            </span>
          </span>
        </Row>
      </div>
    </div>
  );
}

export function SignalsSection({ signals }: { signals: HealthMetric[] }) {
  const { t, n } = useLocale();
  return (
    <div className="card lift p-5">
      <SectionTitle>{t("vitalId.currentSignals")}</SectionTitle>
      {signals.length === 0 && <p className="mt-3 text-sm text-muted">{t("empty.dashboard.title")}</p>}
      <div className="mt-3 divide-y divide-line">
        {signals.map((m) => {
          const tone = statusTone(m.status, isWorse(m));
          const decimals = METRIC_META[m.metric].decimals;
          return (
            <div key={m.metric} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-sm font-medium text-ink-2">
                {t(`metric.${m.metric}` as TranslationKey)}
              </span>
              <span className="flex items-center gap-3">
                <span className="tabular text-sm font-semibold">
                  {n(m.value, decimals)}{" "}
                  <span className="text-xs font-normal text-muted">
                    {t(`unit.${m.unit}` as TranslationKey)}
                  </span>
                </span>
                <StatusBadge status={m.status} tone={tone} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TrendsSection({ insights }: { insights: Insight[] }) {
  const { t } = useLocale();
  return (
    <div className="surface p-5">
      <SectionTitle>{t("vitalId.recentTrends")}</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {insights.map((insight) => (
          <li key={insight.id} className="flex items-start gap-2.5 text-sm leading-snug">
            <span
              aria-hidden
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                insight.severity === "attention" ? "bg-warn" : "bg-brand"
              }`}
            />
            {t(insight.key as TranslationKey, insight.params)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HealthProfileSection({ profile }: { profile: HealthProfile }) {
  const { t, n, locale } = useLocale();
  const listSep = locale === "ar" ? "، " : ", ";
  return (
    <div className="surface p-5">
      <SectionTitle>{t("vitalId.healthProfile")}</SectionTitle>
      <div className="mt-3 divide-y divide-line">
        <Row label={t("vitalId.height")}>
          <span className="tabular">
            {n(profile.heightCm)} {t("vitalId.cm")}
          </span>
        </Row>
        <Row label={t("vitalId.weight")}>
          <span className="tabular">
            {n(profile.weightKg)} {t("vitalId.kg")}
          </span>
        </Row>
        <Row label={t("vitalId.medications")}>
          {profile.medications.length === 0 ? t("vitalId.none") : profile.medications.join(listSep)}
        </Row>
      </div>
    </div>
  );
}

export function SourcePills({ sources }: { sources: DataSource[] }) {
  const { t } = useLocale();
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {sources.map((s) => (
        <span
          key={s}
          className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand"
        >
          {t(`source.${s}` as TranslationKey)}
        </span>
      ))}
    </div>
  );
}
