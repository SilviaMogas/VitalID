import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/server";
import { buildHealthMetric, buildHealthMetrics, generateInsights, buildVitalIdSnapshot } from "@/lib/analytics";
import { DEMO_DAYS, DEMO_IDENTITY, METRIC_META, getDailyRecords } from "@/lib/demo-data";
import { DEMO_USER_KEY } from "@/lib/membership/constants";
import { getOnboardingStore } from "@/lib/onboarding/store";
import { emptySetup, type UserSetup } from "@/lib/onboarding/types";
import { getWhoopBody, getWhoopDaily, getWhoopStatus } from "@/lib/connectors/whoop";
import type { WhoopConnectionPublic, WhoopDaily } from "@/lib/connectors/whoop/types";
import type {
  DailyRecord,
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
 *   1. real connected provider data     (WHOOP OAuth sync)          → source "whoop"
 *   2. provider sample data             (Circular Ring for Fatima)
 *   3. manual onboarding baseline        (Step 4 of setup)          → source "manual"
 *   4. demo fallback                     (deterministic seed data)  → source "demo"
 *
 * Fatima (no server session) is served the prepared demo dataset; when the
 * demo WHOOP connection (keyed by DEMO_USER_KEY) has synced rows, they take
 * precedence over the Circular Ring records for WHOOP-supplied metrics.
 * Real members never receive Fatima's identity/profile.
 */

export type DataOwner = "fatima" | "member";

export interface ResolvedUserData {
  owner: DataOwner;
  identity: Identity;
  metrics: HealthMetric[];
  insights: Insight[];
  snapshot: VitalIdSnapshot;
  /** Public WHOOP connection state (never tokens). */
  whoop: WhoopConnectionPublic;
  /** Present for members only. */
  setup: UserSetup | null;
}

/** WHOOP daily column → dashboard metric. */
const WHOOP_METRIC_FIELD: [MetricKey, keyof WhoopDaily][] = [
  ["recovery", "recoveryScore"],
  ["sleep", "sleepHours"],
  ["hrv", "hrvMs"],
  ["restingHeartRate", "restingHr"],
  ["activity", "workoutMinutes"],
];

function roundFor(metric: MetricKey, v: number): number {
  const f = 10 ** METRIC_META[metric].decimals;
  return Math.round(v * f) / f;
}

/**
 * Overlays WHOOP daily rows on the fallback record series (aligned by date).
 * WHOOP days newer than the fallback range are appended. Returns the merged
 * records plus the set of metrics that have at least one non-null WHOOP value.
 */
function applyWhoop(
  fallbackRecords: DailyRecord[],
  whoopDaily: WhoopDaily[],
): { records: DailyRecord[]; whoopMetrics: Set<MetricKey> } {
  const whoopMetrics = new Set<MetricKey>();
  for (const w of whoopDaily) {
    for (const [metric, field] of WHOOP_METRIC_FIELD) {
      if (w[field] !== null) whoopMetrics.add(metric);
    }
  }

  const byDate = new Map(whoopDaily.map((w) => [w.date, w]));
  // For WHOOP-supplied metrics, gaps carry the latest WHOOP value forward so
  // the current reading is never a fallback number labelled "whoop".
  const lastSeen = new Map<MetricKey, number>();
  const overlay = (base: DailyRecord, date: string): DailyRecord => {
    const w = byDate.get(date);
    const rec: DailyRecord = { ...base, date };
    for (const [metric, field] of WHOOP_METRIC_FIELD) {
      const v = w?.[field];
      if (typeof v === "number") {
        rec[metric] = roundFor(metric, v);
        lastSeen.set(metric, rec[metric]);
      } else if (whoopMetrics.has(metric) && lastSeen.has(metric)) {
        rec[metric] = lastSeen.get(metric)!;
      }
    }
    return rec;
  };

  const records = fallbackRecords.map((r) => overlay(r, r.date));
  const lastDate = fallbackRecords[fallbackRecords.length - 1]?.date ?? "";
  const seed = fallbackRecords[fallbackRecords.length - 1] ?? {
    date: "",
    recovery: 0,
    sleep: 0,
    hrv: 0,
    restingHeartRate: 0,
    activity: 0,
  };
  const today = new Date().toISOString().slice(0, 10);
  for (const w of whoopDaily) {
    if (w.date > lastDate && w.date <= today) records.push(overlay(seed, w.date));
  }
  records.sort((a, b) => (a.date < b.date ? -1 : 1));
  return { records, whoopMetrics };
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

function memberMetrics(
  setup: UserSetup,
  whoop: WhoopConnectionPublic,
  whoopDaily: WhoopDaily[],
): { metrics: HealthMetric[]; records: DailyRecord[]; hasWhoop: boolean } {
  const fallbackRecords = getDailyRecords();
  const { records, whoopMetrics } = whoop.connected
    ? applyWhoop(fallbackRecords, whoopDaily)
    : { records: fallbackRecords, whoopMetrics: new Set<MetricKey>() };

  const metrics = buildHealthMetrics(fallbackRecords).map((fallback): HealthMetric => {
    if (whoopMetrics.has(fallback.metric)) {
      return { ...buildHealthMetric(records, fallback.metric), source: "whoop" };
    }
    const manual = manualValue(setup, fallback.metric);
    if (manual !== null) return flatMetric(fallback.metric, manual, "manual");
    return { ...fallback, source: "demo" };
  });
  return { metrics, records, hasWhoop: whoopMetrics.size > 0 };
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

function memberProfile(setup: UserSetup, body: WhoopBody | null): HealthProfile {
  return {
    heightCm: body ? Math.round(body.heightM * 100) : (setup.profile.heightCm ?? 0),
    weightKg: body ? body.weightKg : (setup.profile.weightKg ?? 0),
    maxHeartRate: body?.maxHeartRate ?? undefined,
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

function fatimaData(
  whoop: WhoopConnectionPublic,
  whoopDaily: WhoopDaily[],
  body: WhoopBody | null,
): ResolvedUserData {
  const fallback = getDailyRecords();
  if (whoop.connected && whoopDaily.length > 0) {
    const { records, whoopMetrics } = applyWhoop(fallback, whoopDaily);
    const metrics: HealthMetric[] = buildHealthMetrics(records).map((m): HealthMetric =>
      whoopMetrics.has(m.metric) ? { ...m, source: "whoop" } : m,
    );
    const snapshot = buildVitalIdSnapshot(records);
    const sources = Array.from(new Set<DataSource>([...snapshot.sources, "whoop"]));
    return {
      owner: "fatima",
      identity: DEMO_IDENTITY,
      metrics,
      insights: generateInsights(records),
      snapshot: {
        ...snapshot,
        currentSignals: metrics,
        healthProfile: body
          ? {
              ...snapshot.healthProfile,
              heightCm: Math.round(body.heightM * 100),
              weightKg: body.weightKg,
              maxHeartRate: body.maxHeartRate ?? undefined,
            }
          : snapshot.healthProfile,
        sources,
        lastUpdated: whoop.lastSyncedAt ?? snapshot.lastUpdated,
      },
      whoop,
      setup: null,
    };
  }
  return {
    owner: "fatima",
    identity: DEMO_IDENTITY,
    metrics: buildHealthMetrics(fallback),
    insights: generateInsights(fallback),
    snapshot: buildVitalIdSnapshot(fallback),
    whoop,
    setup: null,
  };
}

function memberData(
  userId: string,
  setup: UserSetup,
  whoop: WhoopConnectionPublic,
  whoopDaily: WhoopDaily[],
  body: WhoopBody | null,
): ResolvedUserData {
  const { metrics, records, hasWhoop } = memberMetrics(setup, whoop, whoopDaily);
  const identity = memberIdentity(userId, setup);
  const insights: Insight[] = hasWhoop
    ? generateInsights(records)
    : metrics.every((m) => m.source !== "demo")
      ? [{ id: "manual-baseline", key: "insight.manualBaseline", params: {}, metric: "sleep", severity: "info" }]
      : generateInsights(getDailyRecords());
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
      healthProfile: memberProfile(setup, body),
      sources: distinctSources(metrics),
      lastUpdated: (whoop.connected && whoop.lastSyncedAt) || new Date().toISOString(),
    },
    whoop,
    setup,
  };
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
