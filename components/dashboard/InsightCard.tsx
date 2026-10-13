"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n";
import type { Insight } from "@/types";
import { Companion } from "@/components/companions/Companion";
import { ReadAloud } from "@/components/voice/ReadAloud";

export function InsightCard({ insight, compact = false }: { insight: Insight; compact?: boolean }) {
  const { t } = useLocale();
  const attention = insight.severity === "attention";
  const insightText = t(insight.key as TranslationKey, {
    metric: t(`metric.${insight.metric}` as TranslationKey),
    ...insight.params,
  });

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
        <p className="mt-2 text-[11px] text-muted">{t("insight.disclaimer")}</p>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-[1.75rem] border p-5 shadow-card md:p-6 ${
        attention
          ? "border-warn/20 bg-white"
          : "border-line bg-white"
      }`}
    >
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
          <Companion name="heart" size={52} />
          <p className="mt-2 w-full text-center text-xs leading-relaxed text-ink-2">
            {t(attention ? "mascot.insightAttention" : "mascot.insightCalm")}
          </p>
        </div>
      </div>
    </div>
  );
}
