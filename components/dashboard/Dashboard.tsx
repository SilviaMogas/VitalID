"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import type { HealthMetric, Insight } from "@/types";

function greetingKey(): "home.greeting.morning" | "home.greeting.afternoon" | "home.greeting.evening" {
  const h = new Date().getHours();
  if (h < 12) return "home.greeting.morning";
  if (h < 18) return "home.greeting.afternoon";
  return "home.greeting.evening";
}

export function Dashboard({
  metrics,
  insight,
  name,
}: {
  metrics: HealthMetric[];
  insight: Insight;
  name: string;
}) {
  const { t, d } = useLocale();
  const firstName = name.split(" ")[0];
  const today = metrics[0]?.timestamp;

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-medium text-muted">{today ? d(today, { weekday: "long", day: "numeric", month: "long" }) : ""}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
          {t(greetingKey(), { name: firstName })}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("home.subtitle")}</p>
      </section>

      <InsightCard insight={insight} />

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-2">{t("home.signals")}</h2>
          <Link href="/trends" className="text-sm font-medium text-brand">
            {t("home.viewTrends")} →
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((m) => (
            <MetricCard key={m.metric} metric={m} href={`/trends?metric=${m.metric}`} />
          ))}
        </div>
      </section>

      <Link
        href="/vital-id"
        className="card flex items-center justify-between gap-4 bg-ink p-5 text-white transition hover:-translate-y-0.5"
      >
        <div>
          <p className="text-xs font-medium text-white/60">{t("vitalId.cardLabel")}</p>
          <p className="mt-1 text-lg font-semibold tracking-tight">{t("home.openVitalId")}</p>
        </div>
        <span className="text-2xl">→</span>
      </Link>
    </div>
  );
}
