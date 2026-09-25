import crypto from 'node:crypto';
import type { CreateVitalIdShareInput, Json, VitalIdShareRecord } from './types';

export const DEFAULT_SHARE_DURATION_MINUTES = 60;

/** 22-char URL-safe token (128 bits of entropy). */
export function generateShareToken(): string {
  return crypto.randomBytes(16).toString('base64url');
}

/** Copies ONLY the selected top-level keys. Nothing else ever reaches storage. */
export function pickSelectedFields(
  full: Record<string, Json>,
  selectedFields: string[],
): Record<string, Json> {
  const out: Record<string, Json> = {};
  for (const key of selectedFields) {
    if (key in full) out[key] = full[key];
  }
  return out;
}

export function resolveExpiresAt(input: CreateVitalIdShareInput, now: Date): Date {
  if (input.expiresAt) {
    const d = new Date(input.expiresAt);
    if (Number.isNaN(d.getTime())) throw new Error('createVitalIdShare: invalid expiresAt');
    return d;
  }
  const minutes = input.durationMinutes ?? DEFAULT_SHARE_DURATION_MINUTES;
  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new Error('createVitalIdShare: durationMinutes must be > 0');
  }
  return new Date(now.getTime() + minutes * 60_000);
}

export function isVitalIdShareValid(record: VitalIdShareRecord, now: Date = new Date()): boolean {
  if (record.revoked) return false;
  return new Date(record.expiresAt).getTime() > now.getTime();
}

export function invalidReason(record: VitalIdShareRecord, now: Date = new Date()) {
  if (record.revoked) return 'revoked' as const;
  if (new Date(record.expiresAt).getTime() <= now.getTime()) return 'expired' as const;
  return null;
}

/** Builds the full record from input, applying the selected-fields rule. */
export function buildShareRecord(input: CreateVitalIdShareInput, now = new Date()): VitalIdShareRecord {
  if (!Array.isArray(input.selectedFields) || input.selectedFields.length === 0) {
    throw new Error('createVitalIdShare: selectedFields must be a non-empty array');
  }
  return {
    id: crypto.randomUUID(),
    token: input.token ?? generateShareToken(),
    createdAt: now.toISOString(),
    expiresAt: resolveExpiresAt(input, now).toISOString(),
    revoked: false,
    purpose: input.purpose ?? null,
    selectedFields: [...input.selectedFields],
    snapshot: pickSelectedFields(input.fullSnapshot, input.selectedFields),
  };
}

export function stripSnapshot(r: VitalIdShareRecord): Omit<VitalIdShareRecord, 'snapshot'> {
  const { snapshot: _snapshot, ...rest } = r;
  void _snapshot;
  return rest;
}
