"use client";

import { useLocale } from "@/components/providers/LocaleProvider";

/** Hackathon disclosure shown under the pricing grid and on checkout screens. */
export function HackathonSmallPrint({ short = false }: { short?: boolean }) {
  const { t } = useLocale();
  return (
    <p className="text-center text-xs leading-relaxed text-muted">
      {short ? t("pricing.smallPrint.short") : t("pricing.smallPrint")}
    </p>
  );
}
