/**
 * Shared contracts for Vital ID.
 * Consumed by the core experience (Chat A) and the sharing flow (Chat B).
 * Import from "@/types" — do not duplicate business logic.
 */

export type Locale = "en" | "ar";

export type MetricKey =
  | "recovery"
  | "sleep"
  | "hrv"
  | "restingHeartRate"
  | "activity";

export const METRIC_KEYS: MetricKey[] = [
  "recovery",
  "sleep",
  "hrv",
  "restingHeartRate",
  "activity",
];

export type TrendStatus = "stable" | "improving" | "declining" | "unusual";

/** Direction of change from baseline: which way is "good" for this metric. */
export type MetricPolarity = "higherIsBetter" | "lowerIsBetter";

/**
 * Where a value came from. `manual` = onboarding baseline entered by the user,
 * `demo` = deterministic fallback, provider ids = a real connected integration.
 */
export type ProviderSource =
  | "whoop"
  | "oura"
  | "circular_ring"
  | "fitbit"
  | "garmin"
  | "apple_health"
  | "myfitnesspal"
  | "cronometer"
  | "macrofactor"
  | "lifesum"
  | "strava"
  | "medical_records"
  | "uae_health"
  | "calm"
  | "headspace"
  | "wellbeing_future";

export type DataSource = "circularRing" | "demoWearable" | "manualProfile" | "manual" | "demo" | ProviderSource;

/** One day of synthetic signals. Dates are ISO (YYYY-MM-DD). */
export interface DailyRecord {
  date: string;
  recovery: number; // %
  sleep: number; // hours
  hrv: number; // ms
  restingHeartRate: number; // bpm
  activity: number; // active minutes
}

export interface HealthMetric {
  metric: MetricKey;
  value: number;
  unit: string;
  timestamp: string; // ISO date of the latest reading
  source: DataSource;
  baseline: number; // mean of the last `baselineDays` readings (max 30)
  /** Number of the user's own readings the baseline is computed from (1..30). */
  baselineDays: number;
  sevenDayAverage: number;
  delta: number; // absolute change vs baseline (value - baseline)
  deltaPercent: number; // signed percentage vs baseline
  status: TrendStatus;
  polarity: MetricPolarity;
  history: { date: string; value: number }[]; // available readings only, oldest first
}

export interface Insight {
  id: string;
  /** i18n key; params are substituted into the translated template */
  key: string;
  params: Record<string, string | number>;
  metric: MetricKey;
  severity: "info" | "attention";
}

export interface Identity {
  fullName: string;
  /** Optional localized display names, keyed by locale (falls back to fullName). */
  localizedName?: Partial<Record<Locale, string>>;
  /** Public path of a profile picture (demo persona only for now). */
  avatarUrl?: string;
  vitalId: string;
  dateOfBirth: string; // ISO date
  sex: "female" | "male" | "other";
  nationality: string;
}

export interface EmergencyInfo {
  bloodType: string;
  allergies: string[];
  conditions: string[];
  emergencyContact: {
    name: string;
    localizedName?: Partial<Record<Locale, string>>;
    relation: string;
    phone: string;
  };
}

export interface HealthProfile {
  heightCm: number;
  weightKg: number;
  /** From a connected wearable (WHOOP) when available. */
  maxHeartRate?: number;
  medications: string[];
  notes?: string;
}

export interface VitalIdSnapshot {
  identity: Identity;
  emergencyInfo: EmergencyInfo;
  currentSignals: HealthMetric[];
  recentTrends: Insight[];
  healthProfile: HealthProfile;
  sources: DataSource[];
  lastUpdated: string; // ISO datetime
}
