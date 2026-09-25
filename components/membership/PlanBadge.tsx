"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useMembership } from "@/components/providers/MembershipProvider";
import { PLANS } from "@/lib/plans";

/** Current-plan pill linking to /pricing. Hidden while membership loads. */
export function PlanBadge() {
  const { t } = useLocale();
  const { plan, loading } = useMembership();

  if (loading) return null;

  const name = t(PLANS[plan].nameKey);
  return (
    <Link
      href="/pricing"
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        plan === "free"
          ? "border border-line bg-white text-ink-2 hover:bg-canvas"
          : "bg-brand-soft text-brand hover:opacity-90"
      }`}
    >
      {plan === "free" ? `${name} · ${t("pricing.upgrade")}` : name}
    </Link>
  );
}
