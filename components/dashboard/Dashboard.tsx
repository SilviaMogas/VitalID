"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { PlanBadge } from "@/components/membership/PlanBadge";
import type { HealthMetric, Identity, Insight } from "@/types";
import { InsightCard } from "./InsightCard";
import { MetricCard } from "./MetricCard";
import { LogoMark } from "@/components/layout/Logo";
import { MemberSetupPanel } from "./MemberSetupPanel";
import { WhoopConnectorCard } from "@/components/connectors/WhoopConnectorCard";
import type { WhoopConnectionPublic } from "@/lib/connectors/whoop/types";
import type { UserSetup } from "@/lib/onboarding/types";

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
  setup = null,
  whoop,
}: {
  metrics: HealthMetric[];
  insight: Insight;
  identity: Identity;
  /** Onboarding setup for real members; null for the Fatima demo. */
  setup?: UserSetup | null;
  /** Public WHOOP connection state (never tokens). */
  whoop: WhoopConnectionPublic;
}) {
  const { t, d, locale } = useLocale();
  const firstName = (identity.localizedName?.[locale] ?? identity.fullName).split(" ")[0];
  const today = metrics[0]?.timestamp;
  const unusual = metrics.filter((m) => m.status === "unusual").length;

  return (
    <div className="space-y-7">
      <section className="rise flex items-end justify-between gap-4" style={{ ["--i" as string]: 0 }}>
        <div>
          <p className="eyebrow">
            {today ? d(today, { weekday: "long", day: "numeric", month: "long" }) : ""}
          </p>
          <h1 className="mt-1.5 text-[1.75rem] font-semibold leading-tight tracking-tight md:text-4xl">
            {t(greetingKey(), { name: firstName })}
          </h1>
          <p className="mt-1.5 text-sm text-ink-2">{t("home.subtitle")}</p>
          <div className="mt-3">
            <PlanBadge />
          </div>
        </div>
        <Link
          href="/vital-id"
          className="press hidden items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-brand ring-1 ring-line sm:inline-flex"
        >
          <LogoMark size={16} />
          <span dir="ltr" className="font-mono tracking-wider">{identity.vitalId}</span>
        </Link>
      </section>

      <div className="rise" style={{ ["--i" as string]: 1 }}>
        <InsightCard insight={insight} />
      </div>

      <section>
        <div className="rise flex items-center justify-between" style={{ ["--i" as string]: 2 }}>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-ink-2">{t("home.signals")}</h2>
            {unusual > 0 && (
              <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[10px] font-semibold text-warn">
                {unusual}
              </span>
            )}
          </div>
          <Link href="/trends" className="press text-sm font-medium text-brand">
            {t("home.viewTrends")} <span className="inline-block rtl:-scale-x-100">→</span>
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((m, i) => (
            <MetricCard key={m.metric} metric={m} href={`/trends?metric=${m.metric}`} index={i} />
          ))}
        </div>
      </section>

      <WhoopConnectorCard status={whoop} />

      {setup && <MemberSetupPanel setup={setup} />}

      <Link
        href="/vital-id"
        className="rise lift hero-green shimmer relative flex items-center justify-between gap-4 overflow-hidden rounded-[1.75rem] p-5 md:p-6"
        style={{ ["--i" as string]: 8 }}
      >
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 400 120">
          <path d="M-20 100 C 90 50, 180 130, 280 80 S 380 40, 440 90 L 440 140 L -20 140 Z" fill="#0a5c48" opacity="0.5" />
          <ellipse cx="370" cy="10" rx="90" ry="60" fill="#b7e4c7" opacity="0.15" />
        </svg>
        <div className="relative flex items-center gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <LogoMark size={26} tone="light" />
          </span>
          <div>
            <p className="text-xs font-medium text-white/65">{t("vitalId.cardLabel")}</p>
            <p className="mt-0.5 text-lg font-semibold tracking-tight">{t("home.openVitalId")}</p>
          </div>
        </div>
        <span className="relative grid h-9 w-9 place-items-center rounded-full bg-white/15 text-lg rtl:-scale-x-100">→</span>
      </Link>
    </div>
  );
}
