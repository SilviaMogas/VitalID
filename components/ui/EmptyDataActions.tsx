"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";

/** The two CTAs on every "no health data yet" state: add a manual baseline, or connect a provider. */
export function EmptyDataActions({ showManual = true }: { showManual?: boolean }) {
  const { t } = useLocale();
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {showManual && (
        <Link
          href="/onboarding?step=4"
          className="press rounded-full bg-white px-4 py-2 text-sm font-semibold text-alert-deep shadow-card"
        >
          {t("empty.dashboard.manual")}
        </Link>
      )}
      <Link
        href="/connectors"
        className="press rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/40"
      >
        {t("empty.dashboard.connect")}
      </Link>
    </div>
  );
}
