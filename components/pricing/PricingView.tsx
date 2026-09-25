"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useMembership } from "@/components/providers/MembershipProvider";
import { PLAN_ORDER, PLANS, planRank, type PlanId } from "@/lib/plans";
import { HackathonSmallPrint } from "./HackathonSmallPrint";

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4 text-brand">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PricingView() {
  const { t } = useLocale();
  const router = useRouter();
  const { plan: currentPlan, loading } = useMembership();
  const [busyPlan, setBusyPlan] = useState<PlanId | null>(null);
  const onboarding = useSearchParams().get("onboarding") === "1";
  const continueTarget = onboarding ? "/onboarding/connectors" : "/";
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(plan: PlanId) {
    setError(null);
    setBusyPlan(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.status === 503 || data.error === "stripe_not_configured") {
        setError(t("pricing.stripeNotConfigured"));
        return;
      }
      if (!res.ok || !data.url) throw new Error(`HTTP ${res.status}`);
      window.location.assign(data.url);
    } catch {
      setError(t("common.error"));
    } finally {
      setBusyPlan(null);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("pricing.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("pricing.subtitle")}</p>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = !loading && currentPlan === planId;
          const isIncluded = !loading && planRank(currentPlan) > planRank(planId);
          const isPaid = planId !== "free";
          return (
            <div
              key={planId}
              className={`card relative flex flex-col p-5 ${
                plan.recommended ? "ring-2 ring-brand" : ""
              }`}
            >
              {plan.recommended && (
                <span className="absolute -top-3 start-5 rounded-full bg-brand px-3 py-1 text-[11px] font-semibold text-white">
                  {t("pricing.recommended")}
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-3 end-5 rounded-full bg-ink px-3 py-1 text-[11px] font-semibold text-white">
                  {t("pricing.yourPlan")}
                </span>
              )}

              <h2 className="text-lg font-semibold">{t(plan.nameKey)}</h2>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-semibold tracking-tight" dir="ltr">
                  {plan.displayPrice}
                </span>
                <span className="text-sm text-muted">{t(plan.billingLabelKey)}</span>
              </p>

              <ul className="mt-4 flex-1 space-y-2">
                {plan.featureKeys.map((key) => (
                  <li key={key} className="flex items-start gap-2 text-sm text-ink-2">
                    <span className="mt-0.5 shrink-0">
                      <CheckIcon />
                    </span>
                    {t(key)}
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {isCurrent && isPaid ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-2xl border border-line bg-canvas py-3 text-sm font-semibold text-muted"
                  >
                    {t("pricing.currentPlan")}
                  </button>
                ) : isIncluded ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-2xl border border-line bg-canvas py-3 text-sm font-semibold text-muted"
                  >
                    {t("pricing.included")}
                  </button>
                ) : isPaid ? (
                  <>
                    <button
                      type="button"
                      onClick={() => startCheckout(planId)}
                      disabled={busyPlan !== null}
                      className={`w-full rounded-2xl py-3 text-sm font-semibold text-white shadow-md transition disabled:opacity-50 ${
                        plan.recommended ? "bg-brand hover:bg-ink" : "bg-ink hover:bg-brand"
                      }`}
                    >
                      {busyPlan === planId
                        ? t("common.loading")
                        : t("pricing.getPlan", { plan: t(plan.nameKey) })}
                    </button>
                    <div className="mt-2">
                      <HackathonSmallPrint short />
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => router.push(continueTarget)}
                    className="w-full rounded-2xl border border-line bg-white py-3 text-sm font-semibold text-ink-2 transition hover:bg-canvas"
                  >
                    {t("pricing.cta.continueFree")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="text-center text-sm text-bad">{error}</p>}

      <HackathonSmallPrint />
    </div>
  );
}
