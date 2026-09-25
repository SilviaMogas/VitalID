"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n";
import { METRIC_KEYS, type HealthMetric, type Insight, type MetricKey } from "@/types";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { InsightCard } from "@/components/dashboard/InsightCard";

export function TrendsView({ metrics, insights }: { metrics: HealthMetric[]; insights: Insight[] }) {
  const { t } = useLocale();
  const params = useSearchParams();
  const initial = params.get("metric") as MetricKey | null;
  const [selected, setSelected] = useState<MetricKey>(
    initial && METRIC_KEYS.includes(initial) ? initial : "recovery",
  );
  const [range, setRange] = useState<7 | 30>(7);
  const metric = metrics.find((m) => m.metric === selected) ?? metrics[0];

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("trends.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("trends.subtitle")}</p>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {metrics.map((m) => (
          <button
            key={m.metric}
            onClick={() => setSelected(m.metric)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              m.metric === selected ? "bg-ink text-white" : "bg-white text-ink-2 border border-line"
            }`}
          >
            {t(`metric.${m.metric}` as TranslationKey)}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {([7, 30] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-lg px-3 py-1 text-xs font-semibold ${
              range === r ? "bg-brand-soft text-brand" : "text-muted"
            }`}
          >
            {t(r === 7 ? "trends.range.7d" : "trends.range.30d")}
          </button>
        ))}
      </div>

      <MetricCard metric={metric} />

      {insights.filter((i) => i.metric === selected).map((i) => (
        <InsightCard key={i.id} insight={i} compact />
      ))}
    </div>
  );
}
