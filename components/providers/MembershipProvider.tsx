"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getConnectorLimit,
  hasFeature as planHasFeature,
  type Feature,
  type PlanId,
} from "@/lib/plans";

interface MembershipContextValue {
  plan: PlanId;
  loading: boolean;
  isDemoUser: boolean;
  planChosen: boolean;
  onboardingComplete: boolean;
  refresh: () => Promise<void>;
  hasFeature: (feature: Feature) => boolean;
  connectorLimit: number | null;
}

const MembershipContext = createContext<MembershipContextValue | null>(null);

export function MembershipProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<PlanId>("free");
  const [isDemoUser, setIsDemoUser] = useState(true);
  const [planChosen, setPlanChosen] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/membership", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as {
          plan?: PlanId;
          isDemoUser?: boolean;
          planChosen?: boolean;
          onboardingComplete?: boolean;
        };
        if (data.plan === "free" || data.plan === "plus" || data.plan === "pro") {
          setPlan(data.plan);
        }
        setIsDemoUser(Boolean(data.isDemoUser));
        setPlanChosen(Boolean(data.planChosen));
        setOnboardingComplete(Boolean(data.onboardingComplete));
      }
    } catch {
      /* keep current state */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<MembershipContextValue>(
    () => ({
      plan,
      loading,
      isDemoUser,
      planChosen,
      onboardingComplete,
      refresh,
      hasFeature: (feature) => planHasFeature(plan, feature),
      connectorLimit: getConnectorLimit(plan),
    }),
    [plan, loading, isDemoUser, planChosen, onboardingComplete, refresh],
  );

  return <MembershipContext.Provider value={value}>{children}</MembershipContext.Provider>;
}

export function useMembership(): MembershipContextValue {
  const ctx = useContext(MembershipContext);
  if (!ctx) throw new Error("useMembership must be used within MembershipProvider");
  return ctx;
}
