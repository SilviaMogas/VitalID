import type { VitalIdSnapshot } from "@/types";
import type { InsurerId } from "@/lib/insurers";

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
  /**
   * Durable, human-facing reference for this authorization — shown to the
   * sender as a receipt. There is no outbound transport (no email/EDI) yet:
   * this records that the insurer was granted access to the secure link,
   * not that anything was pushed to them.
   */
  deliveryRef: string;
  /** True only when the sender explicitly checked the consent box for this send. */
  consented: boolean;
}

/** Short, unique-enough reference for a single insurer authorization. */
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
    } else if (f === "identity") {
      // The member's photo is private to their own shell/card — never shared.
      const identity: Partial<typeof full.identity> = { ...full.identity };
      delete identity.photoUrl;
      out.identity = identity as never;
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
