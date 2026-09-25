"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { METRIC_META } from "@/lib/demo-data";
import type { TranslationKey } from "@/lib/i18n";
import type { HealthMetric, TrendStatus } from "@/types";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Companion } from "@/components/companions/Companion";
import { COMPANION_FOR_METRIC, companionMood } from "@/lib/companions";
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

const ACCENT = {
  good: "bg-good",
  warn: "bg-warn",
  bad: "bg-bad",
  neutral: "bg-mint",
} as const;

export function MetricCard({ metric, href, index = 0 }: { metric: HealthMetric; href?: string; index?: number }) {
  const { t, n } = useLocale();
  const decimals = METRIC_META[metric.metric].decimals;
  const worse = isWorse(metric);
  const tone = statusTone(metric.status, worse);
  const arrow = metric.deltaPercent === 0 ? "→" : metric.deltaPercent > 0 ? "↑" : "↓";

  const body = (
    <>
      <span aria-hidden className={`absolute inset-y-4 start-0 w-1 rounded-e-full ${ACCENT[tone]} opacity-70`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink-2">{t(`metric.${metric.metric}` as TranslationKey)}</p>
          <p className="mt-1 flex items-baseline gap-1">
            <span className="tabular text-[2rem] font-semibold leading-none tracking-tight">{n(metric.value, decimals)}</span>
            <span className="text-sm text-muted">{t(`unit.${metric.unit}` as TranslationKey)}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusBadge status={metric.status} tone={tone} />
          <Companion name={COMPANION_FOR_METRIC[metric.metric]} mood={companionMood(metric)} size={44} />
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1 text-xs text-muted">
          <p>
            {t("baseline.30day")}{" "}
            <span className="tabular whitespace-nowrap font-medium text-ink-2">
              {n(metric.baseline, decimals)} {t(`unit.${metric.unit}` as TranslationKey)}
            </span>
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0">
            <span
              className={`tabular whitespace-nowrap font-semibold ${
                tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : "text-ink-2"
              }`}
              dir="ltr"
            >
              {arrow} {n(Math.abs(metric.deltaPercent))}%
            </span>
            <span>{t(rangeKey(metric))}</span>
          </p>
        </div>
        <Sparkline values={metric.history.slice(-14).map((h) => h.value)} baseline={metric.baseline} tone={tone} className="h-9 w-20 shrink-0" />
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
        <span className="h-1 w-1 rounded-full bg-muted/60" />
        {t("source.label")}: {t(`source.${metric.source}` as TranslationKey)}
      </p>
    </>
  );

  const cls = "card lift rise relative block overflow-hidden p-4 ps-5";
  const style = { ["--i" as string]: index + 2 };
  return href ? (
    <Link href={href} className={cls} style={style}>
      {body}
    </Link>
  ) : (
    <div className={cls} style={style}>
      {body}
    </div>
  );
}
