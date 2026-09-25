"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n";
import type { TrendStatus } from "@/types";

const TONES = {
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  neutral: "bg-canvas text-ink-2",
} as const;

export function StatusBadge({
  status,
  tone,
}: {
  status: TrendStatus;
  tone: keyof typeof TONES;
}) {
  const { t } = useLocale();
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONES[tone]}`}>
      {t(`status.${status}` as TranslationKey)}
    </span>
  );
}
