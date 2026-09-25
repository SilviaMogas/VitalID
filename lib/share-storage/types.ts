/**
 * Storage-layer types for Vital ID temporary shares.
 *
 * These mirror the `vital_id_shares` table 1:1 and are intentionally
 * independent of UI types. `snapshot` is an opaque JSON object that MUST
 * contain only the fields the user selected (see `pickSelectedFields`).
 */

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** A share exactly as stored (mirrors the `vital_id_shares` row). */
export interface VitalIdShareRecord {
  id: string;
  token: string;
  createdAt: string; // ISO timestamptz
  expiresAt: string; // ISO timestamptz
  revoked: boolean;
  purpose: string | null;
  selectedFields: string[];
  snapshot: Record<string, Json>;
}

export type VitalIdShareSummary = Omit<VitalIdShareRecord, 'snapshot'> & { sentTo?: Json };

export interface CreateVitalIdShareInput {
  /** Top-level keys of `fullSnapshot` the user chose to disclose. */
  selectedFields: string[];
  /**
   * The complete source object. Only `selectedFields` keys are persisted;
   * everything else is dropped before the row is written.
   */
  fullSnapshot: Record<string, Json>;
  /** Either an absolute expiry or a TTL in minutes. */
  expiresAt?: string | Date;
  durationMinutes?: number;
  purpose?: string | null;
  /** Optional pre-generated token; a random URL-safe token is generated if omitted. */
  token?: string;
}

export type ShareInvalidReason = 'not_found' | 'revoked' | 'expired';

export type GetVitalIdShareResult =
  | { valid: true; share: VitalIdShareRecord }
  /** `share` (snapshot stripped) is provided for owner-side status only. */
  | { valid: false; reason: ShareInvalidReason; share: VitalIdShareSummary | null };

export interface ShareStore {
  createVitalIdShare(input: CreateVitalIdShareInput): Promise<VitalIdShareRecord>;
  /** Returns the record only if it exists, is not revoked and has not expired. */
  getVitalIdShareByToken(token: string): Promise<GetVitalIdShareResult>;
  /** Accepts a token or a row id. Returns false when nothing matched. */
  revokeVitalIdShare(tokenOrId: string): Promise<boolean>;
  setVitalIdShareSnapshotKey?(token: string, key: string, value: Json): Promise<boolean>;
  isVitalIdShareValid(record: VitalIdShareRecord, now?: Date): boolean;
  /** Owner-side listing (no snapshots). Handy for dashboards / demo reset. */
  listVitalIdShares(): Promise<VitalIdShareSummary[]>;
  /** Demo reset. */
  clearVitalIdShares(): Promise<void>;
}
