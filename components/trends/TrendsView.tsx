"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useMembership } from "@/components/providers/MembershipProvider";
import { LockIcon, UpgradeChip } from "@/components/membership/UpgradeChip";
import type { TranslationKey } from "@/lib/i18n";
import { METRIC_KEYS, type HealthMetric, type Insight, type MetricKey } from "@/types";
import { METRIC_META } from "@/lib/demo-data";
import { baselineLabel, isWorse, rangeKey, statusTone } from "@/components/dashboard/MetricCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { TrendChart } from "@/components/trends/TrendChart";
import { MascotNote } from "@/components/mascot/MascotNote";
import { DiagonalHero } from "@/components/ui/DiagonalHero";
import { EmptyDataActions } from "@/components/ui/EmptyDataActions";

export function TrendsView({ metrics, insights }: { metrics: HealthMetric[]; insights: Insight[] }) {
  const { t, n } = useLocale();
  const router = useRouter();
  const { hasFeature, loading } = useMembership();
  const locked30d = !loading && !hasFeature("advancedTrends");
  const params = useSearchParams();
  const initial = params.get("metric") as MetricKey | null;
  const [selected, setSelected] = useState<MetricKey>(
    initial && METRIC_KEYS.includes(initial) ? initial : "recovery",
  );
  const [range, setRange] = useState<7 | 30>(7);
  const metric = metrics.find((m) => m.metric === selected) ?? metrics[0];

  if (!metric) {
    return (
      <div className="space-y-6">
        <DiagonalHero title={t("trends.title")} subtitle={t("trends.subtitle")} />
        <section className="alert-banner rounded-[1.75rem] p-6 md:p-8">
          <h2 className="display-italic text-lg sm:text-xl">{t("empty.trends.title")}</h2>
          <p className="mt-3 max-w-prose text-sm text-ink-2">{t("empty.trends.body")}</p>
          <EmptyDataActions />
        </section>
      </div>
    );
  }

  const tone = statusTone(metric.status, isWorse(metric));
  const available = metric.history.length;
  const shown = Math.min(range, available);
  const arrow = metric.deltaPercent === 0 ? "→" : metric.deltaPercent > 0 ? "↑" : "↓";
  const metricInsights = insights.filter((i) => i.metric === selected);

  return (
    <div className="space-y-6">
      <DiagonalHero title={t("trends.title")} subtitle={t("trends.subtitle")} />

      <div className="segmented-control">
        {metrics.map((m) => (
          <button
            key={m.metric}
            aria-pressed={m.metric === selected}
            onClick={() => setSelected(m.metric)}
            className={`press shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              m.metric === selected
                ? "bg-brand text-white shadow-hero"
                : "bg-white text-ink-2 ring-1 ring-line hover:bg-sage"
            }`}
          >
            {t(`metric.${m.metric}` as TranslationKey)}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="segmented-control">
          {([7, 30] as const).map((r) => (
            <button
              key={r}
              aria-pressed={range === r}
              onClick={() => (r === 30 && locked30d ? router.push("/pricing") : setRange(r))}
              className={`press inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                range === r ? "bg-brand text-white shadow-card" : "text-muted hover:text-ink-2"
              }`}
            >
              {t(r === 7 ? "trends.range.7d" : "trends.range.30d")}
              {r === 30 && locked30d && <LockIcon className="h-3 w-3" />}
            </button>
          ))}
        </div>
        {locked30d && <UpgradeChip plan="plus" />}
      </div>

      <div className="card rounded-[1.75rem] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink-2">
              {t(`metric.${metric.metric}` as TranslationKey)}
            </p>
            <p className="mt-1 flex items-baseline gap-1">
              <span className="tabular text-4xl font-semibold tracking-tight">
                {n(metric.value, METRIC_META[metric.metric].decimals)}
              </span>
              <span className="text-sm text-muted">
                {t(`unit.${metric.unit}` as TranslationKey)}
              </span>
            </p>
          </div>
          {available >= 2 && <StatusBadge status={metric.status} tone={tone} />}
        </div>

        <div className={`mt-4 grid gap-2 rounded-xl bg-canvas p-3 text-center ${available >= 2 ? "grid-cols-3" : "grid-cols-2"}`}>
          {[
            { label: t("baseline.today"), value: metric.value },
            ...(available >= 2 ? [{ label: t("baseline.7dayAvg"), value: metric.sevenDayAverage }] : []),
            { label: baselineLabel(metric, t), value: metric.baseline },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-[10px] uppercase tracking-wide text-muted">{s.label}</p>
              <p className="tabular mt-0.5 text-sm font-semibold">
                {n(s.value, METRIC_META[metric.metric].decimals)}
                <span className="ms-0.5 text-[10px] font-normal text-muted">
                  {t(`unit.${metric.unit}` as TranslationKey)}
                </span>
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          {available < 2 ? (
            <p className="alert-banner-soft rounded-xl p-4 text-sm font-medium">{t("empty.trends.single")}</p>
          ) : (
            <>
              <TrendChart metric={metric} days={range} />
              {shown < range && (
                <p className="mt-2 text-[11px] text-muted">{t("trends.range.available", { days: shown })}</p>
              )}
            </>
          )}
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <span
            className={`tabular font-semibold ${
              tone === "good"
                ? "text-good"
                : tone === "bad"
                  ? "text-bad"
                  : tone === "warn"
                    ? "text-warn"
                    : "text-ink-2"
            }`}
            dir="ltr"
          >
            {arrow} {n(Math.abs(metric.deltaPercent))}%
          </span>
          <span>{t(rangeKey(metric))}</span>
        </p>

        {metric.status === "unusual" ? (
          <div className="mt-4">
            <MascotNote state="alert" size={48}>
              {t("mascot.metricUnusual")}
            </MascotNote>
          </div>
        ) : metric.status === "stable" ? (
          <div className="mt-4">
            <MascotNote state="happy" size={48}>
              {t("mascot.metricStable")}
            </MascotNote>
          </div>
        ) : null}
      </div>

      <div>
        <h2 className="eyebrow">{t("trends.whatItMeans")}</h2>
        <div className="mt-2 space-y-3">
          {available < 2 ? (
            <p className="card p-4 text-sm text-ink-2">{t("baseline.manualNote")}</p>
          ) : metricInsights.length === 0 ? (
            <p className="card p-4 text-sm text-ink-2">
              {t(
                metric.status === "stable"
                  ? "insight.metricStable"
                  : metric.deltaPercent > 0
                    ? "insight.metricAbove"
                    : "insight.metricBelow",
                {
                  metric: t(`metric.${metric.metric}` as TranslationKey),
                  percent: n(Math.abs(metric.deltaPercent)),
                },
              )}
            </p>
          ) : (
            metricInsights.map((i) => <InsightCard key={i.id} insight={i} compact />)
          )}
        </div>
      </div>
    </div>
  );
}
