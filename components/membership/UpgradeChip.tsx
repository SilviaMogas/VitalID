"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { PLANS, type PlanId } from "@/lib/plans";

export function UpgradeChip({ plan }: { plan: Exclude<PlanId, "free"> }) {
  const { t } = useLocale();
  return (
    <Link
      href="/pricing"
      className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-ink"
    >
      <LockIcon className="h-3.5 w-3.5" />
      {t("pricing.upgradeTo", { plan: t(PLANS[plan].nameKey) })}
    </Link>
  );
}

export function LockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
    </svg>
  );
}
