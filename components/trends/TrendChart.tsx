"use client";

import { useId } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { METRIC_META } from "@/lib/demo-data";
import type { HealthMetric } from "@/types";
import type { TranslationKey } from "@/lib/i18n";
import { isWorse, statusTone } from "@/components/dashboard/MetricCard";

const TONE_COLOR = {
  good: "#15803d",
  warn: "#b45309",
  bad: "#b91c1c",
  neutral: "#3d5249",
} as const;

const BASELINE_COLOR = "#0e7a5f";

export function TrendChart({ metric, days }: { metric: HealthMetric; days: 7 | 30 }) {
  const { t, n, d } = useLocale();
  const gradientId = useId();
  const decimals = METRIC_META[metric.metric].decimals;
  const tone = statusTone(metric.status, isWorse(metric));
  const color = TONE_COLOR[tone];

  const points = metric.history.slice(-days);
  if (points.length < 2) {
    return <p className="text-sm text-muted">{t("trends.noData")}</p>;
  }

  const W = 320;
  const H = 160;
  const PAD_X = 8;
  const PAD_TOP = 18;
  const PAD_BOTTOM = 6;

  const baseline = metric.baseline;
  const bandHigh = baseline * 1.05;
  const bandLow = baseline * 0.95;
  const values = points.map((p) => p.value);
  const min = Math.min(...values, bandLow);
  const max = Math.max(...values, bandHigh);
  const span = max - min || 1;

  const x = (i: number) => PAD_X + (i / (points.length - 1)) * (W - PAD_X * 2);
  const y = (v: number) => PAD_TOP + (1 - (v - min) / span) * (H - PAD_TOP - PAD_BOTTOM);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${(H - PAD_BOTTOM).toFixed(1)} L${x(0).toFixed(1)},${(H - PAD_BOTTOM).toFixed(1)} Z`;

  const last = points[points.length - 1];
  const lastX = x(points.length - 1);
  const lastY = y(last.value);
  const labelX = Math.min(Math.max(lastX, 40), W - 40);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-0 w-4 border-t-2 border-dashed"
            style={{ borderColor: BASELINE_COLOR }}
          />
          {t("trends.baselineLine")}
        </span>
        <span className="tabular">
          {t("trends.usualRange")} {n(bandLow, decimals)} – {n(bandHigh, decimals)}{" "}
          {t(`unit.${metric.unit}` as TranslationKey)}
        </span>
      </div>

      <div dir="ltr" className="relative">
        <span
          className="tabular pointer-events-none absolute -translate-x-1/2 -translate-y-full text-[11px] font-semibold"
          style={{ left: `${(labelX / W) * 100}%`, top: `${(Math.max(10, lastY - 8) / H) * 100}%`, color }}
        >
          {n(last.value, decimals)}
        </span>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" preserveAspectRatio="none" role="img" aria-hidden>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <rect
            x={PAD_X}
            y={y(bandHigh)}
            width={W - PAD_X * 2}
            height={Math.max(0, y(bandLow) - y(bandHigh))}
            fill={BASELINE_COLOR}
            opacity="0.08"
            rx="4"
          />

          <line
            x1={PAD_X}
            x2={W - PAD_X}
            y1={y(baseline)}
            y2={y(baseline)}
            stroke={BASELINE_COLOR}
            strokeWidth="1.5"
            strokeDasharray="5 4"
            vectorEffect="non-scaling-stroke"
          />

          <path d={area} fill={`url(#${gradientId})`} />
          <path d={line} fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

          <circle cx={lastX} cy={lastY} r="4" fill={color} stroke="#fff" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="mt-1 flex justify-between px-1 text-[10px] text-muted">
          <span>{d(points[0].date)}</span>
          <span>{d(last.date)}</span>
        </div>
      </div>
    </div>
  );
}
