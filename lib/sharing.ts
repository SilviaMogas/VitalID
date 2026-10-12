import type { DataSource, EmergencyInfo, HealthMetric, HealthProfile, Identity, Insight, VitalIdSnapshot } from "@/types";
import type { InsurerId } from "@/lib/insurers";
import { PROVIDERS } from "@/lib/connectors";

export type ShareField =
  | "identity"
  | "emergencyInfo"
  | "currentSignals"
  | "recentTrends"
  | "healthProfile";
export type SharePurpose = "emergency" | "doctor" | "travel" | "caregiver" | "custom";
export type ShareDuration = 15 | 60 | 1440; // minutes
export interface ShareRecipient {
  insurerId: InsurerId;
  sentAt: string;
  /** Internal reference for the sender's metadata record; no delivery occurs. */
  deliveryRef: string;
  /** True only when the sender confirmed the metadata record. */
  consented: boolean;
}

/** Short, unique-enough reference for a single insurer metadata record. */
export function createDeliveryRef(shareId: string, insurerId: InsurerId): string {
  const suffix = Date.now().toString(36).slice(-4);
  return `VID-${shareId.slice(0, 6)}-${insurerId}-${suffix}`.toUpperCase();
}

export interface SharePayload {
  id: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
  purpose: SharePurpose;
  selectedFields: ShareField[];
  sharedBy: string;
  /** Membership user key of the creator; list/revoke are scoped to it. */
  ownerKey?: string;
  /** Authenticated account id permitted to view the share. */
  recipientUserId?: string;
  /** Localized display names from identity.localizedName, keyed by locale. */
  sharedByLocalized?: VitalIdSnapshot["identity"]["localizedName"];
  sentTo?: ShareRecipient[];
  snapshot: Partial<VitalIdSnapshot>;
}

export const PURPOSE_PRESETS: Record<SharePurpose, ShareField[]> = {
  emergency: ["identity", "emergencyInfo", "currentSignals"],
  doctor: ["identity", "currentSignals", "recentTrends", "healthProfile"],
  travel: ["identity", "emergencyInfo"],
  caregiver: ["identity", "emergencyInfo", "currentSignals", "recentTrends"],
  custom: ["identity"],
};

export const SHARE_FIELDS: ShareField[] = [
  "identity",
  "emergencyInfo",
  "currentSignals",
  "recentTrends",
  "healthProfile",
];
export const SHARE_DURATIONS: ShareDuration[] = [15, 60, 1440];
export const SHARE_PURPOSES: SharePurpose[] = [
  "emergency",
  "doctor",
  "travel",
  "caregiver",
  "custom",
];

function projectLocalizedName(
  name: Identity["localizedName"] | undefined,
): Identity["localizedName"] | undefined {
  if (!name || typeof name !== "object") return undefined;
  const localizedName = {
    ...(typeof name.en === "string" ? { en: name.en } : {}),
    ...(typeof name.ar === "string" ? { ar: name.ar } : {}),
  };
  return Object.keys(localizedName).length ? localizedName : undefined;
}

function projectIdentity(identity: Identity | undefined): Identity | undefined {
  if (!identity) return undefined;
  const localizedName = projectLocalizedName(identity.localizedName);
  return {
    fullName: identity.fullName,
    ...(localizedName ? { localizedName } : {}),
    vitalId: identity.vitalId,
    dateOfBirth: identity.dateOfBirth,
    sex: identity.sex,
    nationality: identity.nationality,
  };
}

function projectEmergencyInfo(info: EmergencyInfo | undefined): EmergencyInfo | undefined {
  if (!info) return undefined;
  const contact = info.emergencyContact;
  return {
    bloodType: info.bloodType,
    allergies: Array.isArray(info.allergies) ? info.allergies.filter((value) => typeof value === "string") : [],
    conditions: Array.isArray(info.conditions) ? info.conditions.filter((value) => typeof value === "string") : [],
    emergencyContact: {
      name: contact.name,
      ...(contact.localizedName
        ? {
            localizedName: {
              ...(contact.localizedName.en ? { en: contact.localizedName.en } : {}),
              ...(contact.localizedName.ar ? { ar: contact.localizedName.ar } : {}),
            },
          }
        : {}),
      relation: contact.relation,
      phone: contact.phone,
    },
  };
}

function projectSignal(signal: HealthMetric): Omit<HealthMetric, "history"> {
  return {
    metric: signal.metric,
    value: signal.value,
    unit: signal.unit,
    timestamp: signal.timestamp,
    source: signal.source,
    baseline: signal.baseline,
    baselineDays: signal.baselineDays,
    sevenDayAverage: signal.sevenDayAverage,
    delta: signal.delta,
    deltaPercent: signal.deltaPercent,
    status: signal.status,
    polarity: signal.polarity,
  };
}

const PROJECTED_SOURCE_IDS = new Set(["manual", "manualProfile", "demo", "demoWearable", "circularRing"]);

function isProjectedSource(value: unknown): value is DataSource {
  return typeof value === "string" && (
    PROJECTED_SOURCE_IDS.has(value) || Object.hasOwn(PROVIDERS, value)
  );
}

function projectInsight(insight: Insight): Insight {
  const allowedParams = new Set(["days", "minutes", "percent"]);
  const params = Object.fromEntries(
    Object.entries(insight.params ?? {}).filter(
      (entry): entry is [string, string | number] =>
        allowedParams.has(entry[0]) &&
        (typeof entry[1] === "string" || typeof entry[1] === "number"),
    ),
  );
  return {
    id: insight.id,
    key: insight.key,
    params,
    metric: insight.metric,
    severity: insight.severity,
  };
}

function projectHealthProfile(profile: HealthProfile | undefined): HealthProfile | undefined {
  if (!profile) return undefined;
  return {
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    ...(profile.maxHeartRate !== undefined ? { maxHeartRate: profile.maxHeartRate } : {}),
    medications: Array.isArray(profile.medications) ? profile.medications.filter((value) => typeof value === "string") : [],
  };
}

/** Copies only recognized selected fields and their explicitly permitted data. */
export function projectSnapshot(
  snapshot: Partial<VitalIdSnapshot>,
  fields: readonly string[],
): Partial<VitalIdSnapshot> {
  const out: Partial<VitalIdSnapshot> = {};
  const selected = new Set(fields);
  if (selected.has("identity") && snapshot.identity) {
    out.identity = projectIdentity(snapshot.identity);
  }
  if (selected.has("emergencyInfo") && snapshot.emergencyInfo) {
    out.emergencyInfo = projectEmergencyInfo(snapshot.emergencyInfo);
  }
  if (selected.has("currentSignals") && Array.isArray(snapshot.currentSignals)) {
    out.currentSignals = snapshot.currentSignals.map(projectSignal) as never;
    const sources = [...new Set(
      (out.currentSignals as HealthMetric[]).map((signal) => signal.source).filter(isProjectedSource),
    )];
    if (sources.length) out.sources = sources;
  }
  if (selected.has("recentTrends") && Array.isArray(snapshot.recentTrends)) {
    out.recentTrends = snapshot.recentTrends.map(projectInsight);
  }
  if (selected.has("healthProfile") && snapshot.healthProfile) {
    out.healthProfile = projectHealthProfile(snapshot.healthProfile);
  }
  return out;
}

/** Builds the same allowlisted snapshot used by the preview and recipient APIs. */
export function buildSnapshot(
  full: VitalIdSnapshot,
  fields: ShareField[],
): Partial<VitalIdSnapshot> {
  if (full.currentSignals.some((m) => m.source === "demoWearable" || m.source === "circularRing" || m.source === "demo")) {
    throw new Error("Demo data cannot be shared as health measurements");
  }
  return projectSnapshot(full, fields);
}

export function normalizeRecipientUserId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const userId = value.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return null;
  }
  return userId.toLowerCase();
}

export function projectSharePayload(payload: SharePayload) {
  const selectedFields = Array.from(
    new Set(
      (Array.isArray(payload.selectedFields) ? payload.selectedFields : [])
        .filter((field): field is ShareField => SHARE_FIELDS.includes(field)),
    ),
  );
  const snapshot = projectSnapshot(payload.snapshot, selectedFields);
  const result = {
    id: payload.id,
    createdAt: payload.createdAt,
    expiresAt: payload.expiresAt,
    revoked: payload.revoked,
    purpose: SHARE_PURPOSES.includes(payload.purpose) ? payload.purpose : "custom" as SharePurpose,
    selectedFields,
    snapshot,
  };
  if (selectedFields.includes("identity")) {
    const sharedBy = payload.sharedBy || snapshot.identity?.fullName;
    if (sharedBy) Object.assign(result, { sharedBy });
    const localizedName = projectLocalizedName(snapshot.identity?.localizedName)
      ?? projectLocalizedName(payload.sharedByLocalized);
    if (localizedName) Object.assign(result, { sharedByLocalized: localizedName });
  }
  return result;
}

export function canReadShare(
  payload: SharePayload,
  user: { id: string; email: string | null },
): boolean {
  if (payload.ownerKey === user.id) return true;
  const recipientUserId = normalizeRecipientUserId(payload.recipientUserId);
  return Boolean(recipientUserId && user.id === recipientUserId);
}

export function isShareActive(p: SharePayload, now = Date.now()): boolean {
  const expires = Date.parse(p.expiresAt);
  return !p.revoked && Number.isFinite(expires) && expires > now;
}
