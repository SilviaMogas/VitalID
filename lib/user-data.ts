import "server-only";
import { cache } from "react";
import { getCurrentUser, hasMemberCookies } from "@/lib/auth/server";
import { buildHealthMetrics, generateInsights, buildVitalIdSnapshot } from "@/lib/analytics";
import { DEMO_DAYS, DEMO_IDENTITY, METRIC_META, getDailyRecords } from "@/lib/demo-data";
import { getOnboardingStore } from "@/lib/onboarding/store";
import { emptySetup, type UserSetup } from "@/lib/onboarding/types";
import type { ProviderId } from "@/lib/connectors";
import type {
  DataSource,
  EmergencyInfo,
  HealthMetric,
  HealthProfile,
  Identity,
  Insight,
  MetricKey,
  VitalIdSnapshot,
} from "@/types";

/**
 * Single place that decides where dashboard numbers come from.
 *
 * Priority, per metric:
 *   1. real connected provider data     (a connector with status `connected`)
 *   2. manual onboarding baseline        (Step 4 of setup)         → source "manual"
 *   3. demo fallback                     (deterministic seed data) → source "demo"
 *
 * Fatima (no server session) is served the prepared demo dataset unchanged.
 * Real members never receive Fatima's identity/profile.
 */

export type DataOwner = "fatima" | "member";

export interface ResolvedUserData {
  owner: DataOwner;
  identity: Identity;
  metrics: HealthMetric[];
  insights: Insight[];
  snapshot: VitalIdSnapshot;
  /** Present for members only. */
  setup: UserSetup | null;
}

/** Hook point for real integrations: return a value for the metric when a provider is connected. */
function connectedProviderValue(setup: UserSetup, metric: MetricKey): { value: number; provider: ProviderId } | null {
  const connected = setup.connectors.filter((c) => c.status === "connected");
  if (connected.length === 0) return null;
  // No provider integration fetches data yet; once one does, look up `metric` here.
  void metric;
  return null;
}

function manualValue(setup: UserSetup, metric: MetricKey): number | null {
  switch (metric) {
    case "sleep":
      return setup.baseline.sleepHours;
    case "restingHeartRate":
      return setup.baseline.restingHr;
    default:
      return null;
  }
}

function isoDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function flatMetric(metric: MetricKey, value: number, source: DataSource): HealthMetric {
  const meta = METRIC_META[metric];
  const history = Array.from({ length: DEMO_DAYS }, (_, i) => ({ date: isoDaysAgo(DEMO_DAYS - 1 - i), value }));
  return {
    metric,
    value,
    unit: meta.unit,
    timestamp: history[history.length - 1].date,
    source,
    baseline: value,
    sevenDayAverage: value,
    delta: 0,
    deltaPercent: 0,
    status: "stable",
    polarity: meta.polarity,
    history,
  };
}

function memberMetrics(setup: UserSetup): HealthMetric[] {
  const demo = buildHealthMetrics(getDailyRecords());
  return demo.map((fallback) => {
    const live = connectedProviderValue(setup, fallback.metric);
    if (live) return flatMetric(fallback.metric, live.value, live.provider);
    const manual = manualValue(setup, fallback.metric);
    if (manual !== null) return flatMetric(fallback.metric, manual, "manual");
    return { ...fallback, source: "demo" };
  });
}

function splitList(v: string): string[] {
  return v
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function memberIdentity(userId: string, setup: UserSetup): Identity {
  const p = setup.profile;
  const country = (p.country.trim().slice(0, 2) || "XX").toUpperCase();
  const short = userId.replace(/-/g, "").slice(0, 5).toUpperCase();
  return {
    fullName: `${p.firstName} ${p.lastName}`.trim() || "Vital ID member",
    vitalId: `VID-${country}-${short}`,
    dateOfBirth: p.dob || "",
    sex: p.gender === "male" ? "male" : p.gender === "female" ? "female" : "other",
    nationality: p.nationality || p.country,
    photoUrl: p.photoUrl || undefined,
  };
}

function memberEmergency(setup: UserSetup): EmergencyInfo {
  const h = setup.health;
  return {
    bloodType: h.bloodType || "—",
    allergies: splitList(h.allergies),
    conditions: splitList(h.conditions),
    emergencyContact: {
      name: h.emergencyContactName || "—",
      relation: "",
      phone: h.emergencyContactPhone || "—",
    },
  };
}

function memberProfile(setup: UserSetup): HealthProfile {
  return {
    heightCm: setup.profile.heightCm ?? 0,
    weightKg: setup.profile.weightKg ?? 0,
    medications: splitList(setup.health.medications),
    notes: setup.health.notes || undefined,
  };
}

function distinctSources(metrics: HealthMetric[]): DataSource[] {
  const seen = new Set<DataSource>();
  for (const m of metrics) seen.add(m.source);
  seen.add("manualProfile");
  return [...seen];
}

function fatimaData(): ResolvedUserData {
  const records = getDailyRecords();
  return {
    owner: "fatima",
    identity: DEMO_IDENTITY,
    metrics: buildHealthMetrics(records),
    insights: generateInsights(records),
    snapshot: buildVitalIdSnapshot(records),
    setup: null,
  };
}

function memberData(userId: string, setup: UserSetup): ResolvedUserData {
  const metrics = memberMetrics(setup);
  const identity = memberIdentity(userId, setup);
  const manualKeys = new Set(metrics.filter((m) => m.source !== "demo").map((m) => m.metric));
  const demoInsights = generateInsights(getDailyRecords()).filter((i) => !manualKeys.has(i.metric));
  const insights: Insight[] =
    manualKeys.size > 0
      ? [{ id: "manual-baseline", key: "insight.manualBaseline", params: {}, metric: "sleep", severity: "info" }, ...demoInsights]
      : demoInsights;
  return {
    owner: "member",
    identity,
    metrics,
    insights,
    snapshot: {
      identity,
      emergencyInfo: memberEmergency(setup),
      currentSignals: metrics,
      recentTrends: insights,
      healthProfile: memberProfile(setup),
      sources: distinctSources(metrics),
      lastUpdated: new Date().toISOString(),
    },
    setup,
  };
}

/** Resolves the data set for the current request: member (Supabase session) or Fatima demo. */
export const resolveUserData = cache(async (): Promise<ResolvedUserData> => {
  const user = await getCurrentUser();
  if (user) {
    const setup = (await getOnboardingStore().get(user.id)) ?? emptySetup();
    return memberData(user.id, setup);
  }
  // A member whose access token expired must never be shown (or share) Fatima's data.
  if (await hasMemberCookies()) return memberData("expired", emptySetup());
  return fatimaData();
});
