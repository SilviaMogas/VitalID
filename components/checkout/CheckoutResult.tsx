"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useMembership } from "@/components/providers/MembershipProvider";
import { PLANS } from "@/lib/plans";
import { HackathonSmallPrint } from "@/components/pricing/HackathonSmallPrint";

export type CheckoutStatus = "activated" | "failed" | "cancelled";

export function CheckoutResult({
  status,
  plan,
  reason,
}: {
  status: CheckoutStatus;
  plan?: "plus" | "pro";
  reason?: string;
}) {
  const { t } = useLocale();
  const { account, refresh: refreshAuth } = useAuth();
  const { refresh: refreshMembership } = useMembership();

  useEffect(() => {
    if (status !== "activated") return;
    void refreshAuth();
    void refreshMembership();
  }, [status, refreshAuth, refreshMembership]);

  const continueOnboarding = account !== null && !account.onboardingCompleted;
  const primary = continueOnboarding
    ? { href: "/onboarding", label: t("checkout.continueOnboarding") }
    : { href: "/", label: t("checkout.goDashboard") };
  const secondary = { href: "/pricing", label: t("checkout.managePlan") };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 py-12 text-center">
      {status === "activated" && (
        <>
          <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-brand">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-8 w-8">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            {t("checkout.welcome", { plan: plan ? t(PLANS[plan].nameKey) : "" })}
          </h1>
          <p className="mt-2 text-sm text-muted">{t("checkout.active")}</p>
        </>
      )}

      {status === "failed" && (
        <>
          <span className="grid h-16 w-16 place-items-center rounded-full bg-bad-soft text-bad">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-8 w-8">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">{t("checkout.failedTitle")}</h1>
          <p className="mt-2 text-sm text-muted">
            {t("checkout.failedBody")}
            {reason ? ` (${reason})` : ""}
          </p>
        </>
      )}

      {status === "cancelled" && (
        <>
          <span className="grid h-16 w-16 place-items-center rounded-full bg-canvas text-muted">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
              <path d="M12 8v5m0 3h.01" strokeLinecap="round" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">{t("checkout.cancelledTitle")}</h1>
          <p className="mt-2 text-sm text-muted">{t("checkout.cancelledBody")}</p>
        </>
      )}

      <div className="mt-8 flex w-full flex-col gap-2 sm:flex-row">
        <Link
          href={status === "cancelled" ? "/pricing" : primary.href}
          className="flex-1 rounded-2xl bg-brand py-3 text-sm font-semibold text-white shadow-md transition hover:bg-ink"
        >
          {status === "cancelled" ? t("checkout.backToPricing") : primary.label}
        </Link>
        <Link
          href={status === "cancelled" ? "/" : secondary.href}
          className="flex-1 rounded-2xl border border-line bg-white py-3 text-sm font-semibold text-ink-2 transition hover:bg-canvas"
        >
          {status === "cancelled" ? t("common.goHome") : secondary.label}
        </Link>
      </div>

      <div className="mt-8">
        <HackathonSmallPrint />
      </div>
    </div>
  );
}
