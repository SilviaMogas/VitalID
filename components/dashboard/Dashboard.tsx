"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import type { HealthMetric, Identity, Insight } from "@/types";

function greetingKey(): "home.greeting.morning" | "home.greeting.afternoon" | "home.greeting.evening" {
  const h = new Date().getHours();
  if (h < 12) return "home.greeting.morning";
  if (h < 18) return "home.greeting.afternoon";
  return "home.greeting.evening";
}

export function Dashboard({
  metrics,
  insight,
  identity,
}: {
  metrics: HealthMetric[];
  insight: Insight;
  identity: Identity;
}) {
  const { t, d, locale } = useLocale();
  const firstName = (identity.localizedName?.[locale] ?? identity.fullName).split(" ")[0];
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
            {t("home.viewTrends")} <span className="inline-block rtl:-scale-x-100">→</span>
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
        className="flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-ink to-brand p-5 text-white shadow-card transition hover:-translate-y-0.5"
      >
        <div>
          <p className="text-xs font-medium text-white/60">{t("vitalId.cardLabel")}</p>
          <p className="mt-1 text-lg font-semibold tracking-tight">{t("home.openVitalId")}</p>
        </div>
        <span className="inline-block text-2xl rtl:-scale-x-100">→</span>
      </Link>
    </div>
  );
}
