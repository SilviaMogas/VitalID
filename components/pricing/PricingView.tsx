"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useMembership } from "@/components/providers/MembershipProvider";
import { PLAN_ORDER, PLANS, planRank, type PlanId } from "@/lib/plans";
import { Companion } from "@/components/companions/Companion";
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
  const { status, account, refresh: refreshAuth } = useAuth();
  const { plan: currentPlan, loading, refresh } = useMembership();
  const [busyPlan, setBusyPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inJourney = status === "member" && account !== null && !account.onboardingCompleted;

  async function continueFree() {
    setError(null);
    setBusyPlan("free");
    try {
      if (inJourney) {
        const res = await fetch("/api/membership/choose-free", { method: "POST" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const snap = await refreshAuth();
        router.push(snap?.next ?? "/onboarding");
        return;
      }
      await refresh();
      router.push("/");
    } catch {
      setError(t("common.error"));
    } finally {
      setBusyPlan(null);
    }
  }

  async function startCheckout(plan: PlanId) {
    setError(null);
    setBusyPlan(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
        stage?: string;
        detail?: string;
      };
      if (res.status === 503 || data.error === "stripe_not_configured") {
        setError(t("pricing.stripeNotConfigured"));
        return;
      }
      if (!res.ok || !data.url) {
        const code = [data.stage, data.detail].filter(Boolean).join(" / ");
        setError(`${t("common.error")}${code ? ` (${code})` : ` (HTTP ${res.status})`}`);
        return;
      }
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
        {inJourney && <p className="eyebrow">{t("journey.stepPlan")}</p>}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{t("pricing.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("pricing.subtitle")}</p>
        {!inJourney && status !== "guest" && (
          <Link href="/" className="mt-2 inline-block text-sm font-medium text-brand">
            <span className="inline-block rtl:-scale-x-100">←</span> {t("common.goHome")}
          </Link>
        )}
      </section>

      <div aria-hidden className="flex items-end justify-center gap-0 md:justify-start">
        {(["shield", "heart", "muscle", "moon", "dumbbell"] as const).map((name, i) => (
          <Companion
            key={name}
            name={name}
            mood={i === 1 ? "cheer" : "idle"}
            size={56}
            className="-ms-3 first:ms-0"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = !loading && currentPlan === planId && !(inJourney && planId === "free");
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

              <div className="flex items-start justify-between gap-2 pt-2">
                <div>
                  <h2 className="text-lg font-semibold">{t(plan.nameKey)}</h2>
                  <p className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-semibold tracking-tight" dir="ltr">
                      {plan.displayPrice}
                    </span>
                    <span className="text-sm text-muted">{t(plan.billingLabelKey)}</span>
                  </p>
                </div>
                <Companion
                  name={plan.companion}
                  mood={plan.recommended ? "cheer" : "idle"}
                  size={88}
                  label={t(plan.nameKey)}
                />
              </div>

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
                {isCurrent && inJourney ? (
                  <button
                    type="button"
                    onClick={() => router.push("/onboarding")}
                    className="w-full rounded-2xl bg-brand py-3 text-sm font-semibold text-white shadow-md transition hover:bg-ink"
                  >
                    {t("checkout.continueOnboarding")}
                  </button>
                ) : isCurrent ? (
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
                    onClick={continueFree}
                    disabled={busyPlan !== null}
                    className="w-full rounded-2xl border border-line bg-white py-3 text-sm font-semibold text-ink-2 transition hover:bg-canvas disabled:opacity-50"
                  >
                    {busyPlan === "free" ? t("common.loading") : t("pricing.cta.continueFree")}
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
