"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n";
import type { Insight } from "@/types";
import { Broccoli } from "@/components/mascot/Broccoli";
import { ReadAloud } from "@/components/voice/ReadAloud";

export function InsightCard({ insight, compact = false }: { insight: Insight; compact?: boolean }) {
  const { t } = useLocale();
  const attention = insight.severity === "attention";
  const insightText = t(insight.key as TranslationKey, insight.params);

  if (compact) {
    return (
      <div className="surface p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
          <span className={`h-2 w-2 rounded-full ${attention ? "bg-warn" : "bg-brand"}`} />
          {t("insight.title")}
          <span className="ms-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-ink-2 ring-1 ring-line">
            {t(`metric.${insight.metric}` as TranslationKey)}
          </span>
        </div>
        <p className="mt-2.5 text-base font-medium leading-snug tracking-tight">{insightText}</p>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-[1.75rem] border p-5 shadow-card md:p-6 ${
        attention
          ? "border-warn/15 bg-gradient-to-br from-white via-white to-warn-soft/70"
          : "border-line bg-gradient-to-br from-white via-white to-sage"
      }`}
    >
      <svg aria-hidden className="pointer-events-none absolute -end-10 -top-10 h-40 w-40 opacity-60" viewBox="0 0 100 100">
        <ellipse cx="50" cy="50" rx="50" ry="40" fill={attention ? "#fef3c7" : "#e2f1ea"} />
      </svg>

      <div className="relative flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <span className={`h-2 w-2 rounded-full ${attention ? "bg-warn" : "bg-brand"}`} />
            {t("home.todaysInsight")}
            <span className="ms-auto rounded-full bg-white px-2.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-ink-2 ring-1 ring-line">
              {t(`metric.${insight.metric}` as TranslationKey)}
            </span>
          </div>
          <p className="mt-3 text-lg font-semibold leading-snug tracking-tight md:text-xl">{insightText}</p>
          <p className="mt-2 text-xs text-muted">{t("insight.disclaimer")}</p>
          <ReadAloud text={insightText} owner={`insight-${insight.id}`} className="mt-3" />
        </div>
        <div className="hidden w-40 shrink-0 flex-col items-center sm:flex">
          <Broccoli state={attention ? "alert" : "happy"} size={64} className="anim-float" />
          <p className="surface -mt-1 w-full rounded-2xl px-2.5 py-1.5 text-center text-[11px] font-medium leading-snug text-ink-2">
            {t(attention ? "mascot.insightAttention" : "mascot.insightCalm")}
          </p>
        </div>
      </div>
    </div>
  );
}
