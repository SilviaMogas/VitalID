import crypto from 'node:crypto';
import type { CreateVitalIdShareInput, Json, VitalIdShareRecord } from './types';

export const DEFAULT_SHARE_DURATION_MINUTES = 60;

/** 22-char URL-safe token (128 bits of entropy). */
export function generateShareToken(): string {
  return crypto.randomBytes(16).toString('base64url');
}

const MIN_TOKEN_LENGTH = 16;
const TOKEN_RE = /^[A-Za-z0-9_-]+$/;

function assertValidToken(token: string): void {
  if (token.length < MIN_TOKEN_LENGTH || !TOKEN_RE.test(token)) {
    throw new Error(
      `createVitalIdShare: token must be >= ${MIN_TOKEN_LENGTH} URL-safe chars (use generateShareToken())`,
    );
  }
}

/**
 * Deep-copies ONLY the selected own top-level keys. Nothing else ever reaches
 * storage, and later mutation of the source cannot alter the stored snapshot.
 */
export function pickSelectedFields(
  full: Record<string, Json>,
  selectedFields: string[],
): Record<string, Json> {
  const out: Record<string, Json> = {};
  for (const key of selectedFields) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    if (Object.prototype.hasOwnProperty.call(full, key)) {
      out[key] = JSON.parse(JSON.stringify(full[key])) as Json;
    }
  }
  return out;
}

export function resolveExpiresAt(input: CreateVitalIdShareInput, now: Date): Date {
  if (input.expiresAt !== undefined) {
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
  if (input.token !== undefined) assertValidToken(input.token);
  const snapshot = pickSelectedFields(input.fullSnapshot, input.selectedFields);
  const selectedFields = Object.keys(snapshot);
  if (selectedFields.length === 0) {
    throw new Error('createVitalIdShare: none of selectedFields exist in fullSnapshot');
  }
  return {
    id: crypto.randomUUID(),
    token: input.token ?? generateShareToken(),
    createdAt: now.toISOString(),
    expiresAt: resolveExpiresAt(input, now).toISOString(),
    revoked: false,
    purpose: input.purpose ?? null,
    selectedFields,
    snapshot,
  };
}

export function stripSnapshot(r: VitalIdShareRecord): Omit<VitalIdShareRecord, 'snapshot'> {
  const { snapshot: _snapshot, ...rest } = r;
  void _snapshot;
  return structuredClone(rest);
}
