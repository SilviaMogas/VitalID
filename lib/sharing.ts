import type { VitalIdSnapshot } from "@/types";

export type ShareField =
  | "identity"
  | "emergencyInfo"
  | "currentSignals"
  | "recentTrends"
  | "healthProfile";
export type SharePurpose = "emergency" | "doctor" | "travel" | "caregiver" | "custom";
export type ShareDuration = 15 | 60 | 1440; // minutes

export interface SharePayload {
  id: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
  purpose: SharePurpose;
  selectedFields: ShareField[];
  sharedBy: string;
  /** Localized display names from identity.localizedName, keyed by locale. */
  sharedByLocalized?: VitalIdSnapshot["identity"]["localizedName"];
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

/**
 * Copies ONLY the selected top-level keys from the full snapshot, plus the
 * provenance fields `sources` and `lastUpdated` (not health data).
 * `history` is stripped from each signal — it is raw series data, not needed
 * by the read-only recipient view.
 */
export function buildSnapshot(
  full: VitalIdSnapshot,
  fields: ShareField[],
): Partial<VitalIdSnapshot> {
  const out: Partial<VitalIdSnapshot> = {
    sources: full.sources,
    lastUpdated: full.lastUpdated,
  };
  for (const f of fields) {
    if (f === "currentSignals") {
      out.currentSignals = full.currentSignals.map((m) => {
        const stripped: Partial<typeof m> = { ...m };
        delete stripped.history;
        return stripped;
      }) as never;
    } else {
      out[f] = full[f] as never;
    }
  }
  return out;
}

export function isShareActive(p: SharePayload, now = Date.now()): boolean {
  const expires = Date.parse(p.expiresAt);
  return !p.revoked && Number.isFinite(expires) && expires > now;
}
