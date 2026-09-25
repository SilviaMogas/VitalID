"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { METRIC_META } from "@/lib/demo-data";
import type { TranslationKey } from "@/lib/i18n";
import type { HealthMetric, TrendStatus } from "@/types";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Sparkline } from "@/components/trends/Sparkline";

export function rangeKey(m: HealthMetric): TranslationKey {
  if (m.status === "stable") return "range.within";
  const worse = m.polarity === "higherIsBetter" ? m.deltaPercent < 0 : m.deltaPercent > 0;
  if (m.polarity === "higherIsBetter") return m.deltaPercent < 0 ? "range.below" : "range.above";
  return worse ? "range.above" : "range.below";
}

export function isWorse(m: HealthMetric): boolean {
  return m.polarity === "higherIsBetter" ? m.deltaPercent < 0 : m.deltaPercent > 0;
}

export function statusTone(status: TrendStatus, worse: boolean): "good" | "warn" | "bad" | "neutral" {
  if (status === "stable") return "neutral";
  if (status === "improving") return "good";
  if (status === "declining") return "warn";
  return worse ? "bad" : "good";
}

export function MetricCard({ metric, href }: { metric: HealthMetric; href?: string }) {
  const { t, n } = useLocale();
  const decimals = METRIC_META[metric.metric].decimals;
  const worse = isWorse(metric);
  const tone = statusTone(metric.status, worse);
  const arrow = metric.deltaPercent === 0 ? "→" : metric.deltaPercent > 0 ? "↑" : "↓";

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink-2">{t(`metric.${metric.metric}` as TranslationKey)}</p>
          <p className="mt-1 flex items-baseline gap-1">
            <span className="tabular text-3xl font-semibold tracking-tight">{n(metric.value, decimals)}</span>
            <span className="text-sm text-muted">{t(`unit.${metric.unit}` as TranslationKey)}</span>
          </p>
        </div>
        <StatusBadge status={metric.status} tone={tone} />
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="text-xs text-muted">
          <p>
            {t("baseline.30day")}{" "}
            <span className="tabular font-medium text-ink-2">
              {n(metric.baseline, decimals)} {t(`unit.${metric.unit}` as TranslationKey)}
            </span>
          </p>
          <p className="mt-0.5 flex items-center gap-1.5">
            <span
              className={`tabular font-semibold ${
                tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : "text-ink-2"
              }`}
              dir="ltr"
            >
              {arrow} {n(Math.abs(metric.deltaPercent))}%
            </span>
            <span>{t(rangeKey(metric))}</span>
          </p>
        </div>
        <Sparkline values={metric.history.slice(-14).map((h) => h.value)} baseline={metric.baseline} tone={tone} className="h-9 w-24" />
      </div>

      <p className="mt-3 text-[11px] text-muted">
        {t("source.label")}: {t(`source.${metric.source}` as TranslationKey)}
      </p>
    </>
  );

  const cls = "card block p-4 transition hover:-translate-y-0.5 hover:shadow-md";
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
