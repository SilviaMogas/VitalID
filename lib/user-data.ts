import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/server";
import { buildMetricFromSeries, insightsFromMetrics, type SeriesPoint } from "@/lib/analytics";
import {
  DEMO_EMERGENCY,
  DEMO_IDENTITY,
  DEMO_PROFILE,
  DEMO_SETUP,
  METRIC_META,
  METRIC_SOURCE,
  getDailyRecords,
} from "@/lib/demo-data";
import { DEMO_USER_KEY } from "@/lib/membership/constants";
import { getOnboardingStore } from "@/lib/onboarding/store";
import { emptySetup, type UserSetup } from "@/lib/onboarding/types";
import { getWhoopBody, getWhoopDaily, getWhoopStatus } from "@/lib/connectors/whoop";
import type { WhoopConnectionPublic, WhoopDaily } from "@/lib/connectors/whoop/types";
import {
  METRIC_KEYS,
  type DataSource,
  type EmergencyInfo,
  type HealthMetric,
  type HealthProfile,
  type Identity,
  type Insight,
  type MetricKey,
  type VitalIdSnapshot,
} from "@/types";

/**
 * Single place that decides where dashboard numbers come from.
 *
 * Priority, per metric and per user:
 *   1. real connected provider data   (WHOOP OAuth sync)            → source "whoop"
 *   2. provider sample data assigned  (Circular Ring, Fatima only)  → "circularRing" / "demoWearable"
 *   3. manual onboarding baseline     (Step 4 of setup)             → source "manual"
 *   4. nothing                        → metric is omitted (UI renders an empty state)
 *
 * Every series is built exclusively from that user's own readings; a member
 * never receives Fatima's identity, profile, Circular Ring rows or any other
 * synthetic history. Fatima (no server session) is the only account that gets
 * the prepared sample dataset.
 */

export type DataOwner = "fatima" | "member";

export interface ResolvedUserData {
  owner: DataOwner;
  identity: Identity;
  /** Only metrics for which the user has at least one reading. */
  metrics: HealthMetric[];
  /** Metrics with no data for this user, in display order. */
  missingMetrics: MetricKey[];
  insights: Insight[];
  snapshot: VitalIdSnapshot;
  /** Public WHOOP connection state (never tokens). */
  whoop: WhoopConnectionPublic;
  setup: UserSetup;
}

/** WHOOP daily column → dashboard metric. */
const WHOOP_METRIC_FIELD: Record<MetricKey, keyof WhoopDaily> = {
  recovery: "recoveryScore",
  sleep: "sleepHours",
  hrv: "hrvMs",
  restingHeartRate: "restingHr",
  activity: "workoutMinutes",
};

function roundFor(metric: MetricKey, v: number): number {
  const f = 10 ** METRIC_META[metric].decimals;
  return Math.round(v * f) / f;
}

/** Oldest-first series of the non-null WHOOP readings for one metric. */
function whoopSeries(whoopDaily: WhoopDaily[], metric: MetricKey): SeriesPoint[] {
  const field = WHOOP_METRIC_FIELD[metric];
  return whoopDaily
    .flatMap((w) => {
      const v = w[field];
      return typeof v === "number" ? [{ date: w.date, value: roundFor(metric, v) }] : [];
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1));
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

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface MetricInputs {
  setup: UserSetup;
  whoop: WhoopConnectionPublic;
  whoopDaily: WhoopDaily[];
  /** Provider sample rows explicitly assigned to this user (Fatima's Circular Ring export). */
  sampleSeries: ((metric: MetricKey) => SeriesPoint[]) | null;
}

function resolveMetric(metric: MetricKey, input: MetricInputs): HealthMetric | null {
  if (input.whoop.connected) {
    const live = whoopSeries(input.whoopDaily, metric);
    if (live.length > 0) return buildMetricFromSeries(metric, live, "whoop");
  }
  if (input.sampleSeries) {
    const sample = input.sampleSeries(metric);
    if (sample.length > 0) return buildMetricFromSeries(metric, sample, METRIC_SOURCE[metric]);
  }
  const manual = manualValue(input.setup, metric);
  if (manual !== null) {
    return buildMetricFromSeries(metric, [{ date: today(), value: manual }], "manual");
  }
  return null;
}

function resolveMetrics(input: MetricInputs): { metrics: HealthMetric[]; missing: MetricKey[] } {
  const metrics: HealthMetric[] = [];
  const missing: MetricKey[] = [];
  for (const key of METRIC_KEYS) {
    const m = resolveMetric(key, input);
    if (m) metrics.push(m);
    else missing.push(key);
  }
  return { metrics, missing };
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

interface WhoopBody {
  heightM: number;
  weightKg: number;
  maxHeartRate: number | null;
}

function withWhoopBody(profile: HealthProfile, body: WhoopBody | null): HealthProfile {
  if (!body) return profile;
  return {
    ...profile,
    heightCm: Math.round(body.heightM * 100),
    weightKg: body.weightKg,
    maxHeartRate: body.maxHeartRate ?? undefined,
  };
}

function memberProfile(setup: UserSetup, body: WhoopBody | null): HealthProfile {
  return withWhoopBody(
    {
      heightCm: setup.profile.heightCm ?? 0,
      weightKg: setup.profile.weightKg ?? 0,
      medications: splitList(setup.health.medications),
      notes: setup.health.notes || undefined,
    },
    body,
  );
}

function distinctSources(metrics: HealthMetric[]): DataSource[] {
  const seen = new Set<DataSource>();
  for (const m of metrics) seen.add(m.source);
  seen.add("manualProfile");
  return [...seen];
}

function lastUpdated(metrics: HealthMetric[], whoop: WhoopConnectionPublic): string {
  if (whoop.connected && whoop.lastSyncedAt) return whoop.lastSyncedAt;
  const latest = metrics.map((m) => m.timestamp).sort((a, b) => a.localeCompare(b)).pop();
  return latest ? new Date(`${latest}T00:00:00Z`).toISOString() : new Date().toISOString();
}

function assemble(args: {
  owner: DataOwner;
  identity: Identity;
  setup: UserSetup;
  emergency: EmergencyInfo;
  profile: HealthProfile;
  whoop: WhoopConnectionPublic;
  whoopDaily: WhoopDaily[];
  sampleSeries: MetricInputs["sampleSeries"];
}): ResolvedUserData {
  const { metrics, missing } = resolveMetrics({
    setup: args.setup,
    whoop: args.whoop,
    whoopDaily: args.whoopDaily,
    sampleSeries: args.sampleSeries,
  });
  const insights = insightsFromMetrics(metrics);
  const snapshot: VitalIdSnapshot = {
    identity: args.identity,
    emergencyInfo: args.emergency,
    currentSignals: metrics,
    recentTrends: insights,
    healthProfile: args.profile,
    sources: distinctSources(metrics),
    lastUpdated: lastUpdated(metrics, args.whoop),
  };
  return {
    owner: args.owner,
    identity: args.identity,
    metrics,
    missingMetrics: missing,
    insights,
    snapshot,
    whoop: args.whoop,
    setup: args.setup,
  };
}

function fatimaData(whoop: WhoopConnectionPublic, whoopDaily: WhoopDaily[], body: WhoopBody | null): ResolvedUserData {
  const records = getDailyRecords();
  return assemble({
    owner: "fatima",
    identity: DEMO_IDENTITY,
    setup: DEMO_SETUP,
    emergency: DEMO_EMERGENCY,
    profile: withWhoopBody(DEMO_PROFILE, body),
    whoop,
    whoopDaily,
    sampleSeries: (metric) => records.map((r) => ({ date: r.date, value: r[metric] })),
  });
}

function memberData(
  userId: string,
  setup: UserSetup,
  whoop: WhoopConnectionPublic,
  whoopDaily: WhoopDaily[],
  body: WhoopBody | null,
): ResolvedUserData {
  return assemble({
    owner: "member",
    identity: memberIdentity(userId, setup),
    setup,
    emergency: memberEmergency(setup),
    profile: memberProfile(setup, body),
    whoop,
    whoopDaily,
    sampleSeries: null,
  });
}

/** Resolves the data set for the current request: member (Supabase session) or Fatima demo. */
export const resolveUserData = cache(async (): Promise<ResolvedUserData> => {
  const user = await getCurrentUser();
  const userKey = user?.id ?? DEMO_USER_KEY;
  const [whoop, whoopDaily, body] = await Promise.all([
    getWhoopStatus(userKey),
    getWhoopDaily(userKey),
    getWhoopBody(userKey),
  ]);
  if (!user) return fatimaData(whoop, whoopDaily, body);
  const setup = (await getOnboardingStore().get(user.id)) ?? emptySetup();
  return memberData(user.id, setup, whoop, whoopDaily, body);
});
