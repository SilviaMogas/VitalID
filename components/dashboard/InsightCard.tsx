"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n";
import type { Insight } from "@/types";

export function InsightCard({ insight, compact = false }: { insight: Insight; compact?: boolean }) {
  const { t } = useLocale();
  const attention = insight.severity === "attention";
  return (
    <div
      className={`card relative overflow-hidden p-5 ${
        attention ? "bg-gradient-to-br from-white to-warn-soft/60" : ""
      }`}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <span className={`h-2 w-2 rounded-full ${attention ? "bg-warn" : "bg-brand"}`} />
        {compact ? t("insight.title") : t("home.todaysInsight")}
        <span className="ms-auto rounded-full bg-canvas px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-ink-2">
          {t(`metric.${insight.metric}` as TranslationKey)}
        </span>
      </div>
      <p className={`mt-3 font-medium leading-snug tracking-tight ${compact ? "text-base" : "text-lg"}`}>
        {t(insight.key as TranslationKey, insight.params)}
      </p>
      {!compact && <p className="mt-3 text-xs text-muted">{t("insight.disclaimer")}</p>}
    </div>
  );
}
