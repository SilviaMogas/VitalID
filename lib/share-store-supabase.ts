import 'server-only';
import type { Json } from '@/lib/share-storage/types';
import { SupabaseShareStore } from '@/lib/supabase/shares';
import { isShareActive, type SharePayload, type SharePurpose, type ShareField, type ShareRecipient } from './sharing';
import { DEMO_USER_KEY } from '@/lib/membership/constants';

/**
 * Adapter that persists Chat B's `SharePayload` in `vital_id_shares` via
 * `SupabaseShareStore`. The public share id doubles as the row `token`;
 * `sharedBy` / `sharedByLocalized` ride along inside the stored snapshot and
 * are split back out on read; `sources` / `lastUpdated` are non-health
 * metadata that `buildSnapshot` always includes for the recipient view.
 */

const META_KEYS = ['sharedBy', 'sharedByLocalized', 'ownerKey', 'sentTo', 'sources', 'lastUpdated'] as const;

interface StoreGlobal {
  __vitalIdSupabaseAdapter?: SupabaseShareStore;
}

function store(): SupabaseShareStore {
  const g = globalThis as StoreGlobal;
  g.__vitalIdSupabaseAdapter ??= new SupabaseShareStore();
  return g.__vitalIdSupabaseAdapter;
}

function toPayload(share: {
  token: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
  purpose: string | null;
  selectedFields: string[];
  snapshot?: Record<string, Json>;
  sentTo?: Json;
  ownerKey?: string;
  sharedBy?: string;
}): SharePayload {
  const {
    sharedBy: snapshotSharedBy,
    sharedByLocalized,
    ownerKey: snapshotOwnerKey,
    sentTo: snapshotSentTo,
    ...rest
  } = share.snapshot ?? {};
  const sentTo = share.sentTo ?? snapshotSentTo;
  const ownerKey = share.ownerKey ?? snapshotOwnerKey;
  const sharedBy = share.sharedBy ?? snapshotSharedBy;
  return {
    id: share.token,
    createdAt: share.createdAt,
    expiresAt: share.expiresAt,
    revoked: share.revoked,
    purpose: (share.purpose ?? 'custom') as SharePurpose,
    selectedFields: share.selectedFields.filter(
      (f) => !(META_KEYS as readonly string[]).includes(f),
    ) as ShareField[],
    sharedBy: typeof sharedBy === 'string' ? sharedBy : '',
    ownerKey: typeof ownerKey === 'string' ? ownerKey : undefined,
    sharedByLocalized: (sharedByLocalized ?? undefined) as SharePayload['sharedByLocalized'],
    sentTo: Array.isArray(sentTo) ? (sentTo as unknown as ShareRecipient[]) : [],
    snapshot: rest as SharePayload['snapshot'],
  };
}

export async function createShare(p: SharePayload): Promise<void> {
  const fullSnapshot = {
    ...(p.snapshot as Record<string, Json>),
    sharedBy: p.sharedBy,
    ownerKey: p.ownerKey ?? null,
    sharedByLocalized: (p.sharedByLocalized ?? null) as Json,
    sentTo: (p.sentTo ?? []) as unknown as Json,
  };
  await store().createVitalIdShare({
    token: p.id,
    purpose: p.purpose,
    expiresAt: p.expiresAt,
    selectedFields: [...p.selectedFields, ...META_KEYS],
    fullSnapshot,
  });
}

/** Returns the payload for valid shares; revoked/expired/unknown -> null (never leaks the snapshot). */
export async function getShare(id: string): Promise<SharePayload | null> {
  const res = await store().getVitalIdShareByToken(id);
  return res.valid ? toPayload(res.share) : null;
}

export async function revokeShare(id: string): Promise<boolean> {
  return store().revokeVitalIdShare(id);
}

export async function setShareRecipients(
  id: string,
  sentTo: ShareRecipient[],
): Promise<SharePayload | null> {
  const payload = await getShare(id);
  if (!payload || !isShareActive(payload)) return null;
  const recipients = new Map<ShareRecipient['insurerId'], ShareRecipient>();
  for (const recipient of payload.sentTo ?? []) recipients.set(recipient.insurerId, recipient);
  for (const recipient of sentTo) recipients.set(recipient.insurerId, recipient);
  const updated = Array.from(recipients.values());
  const stored = await store().setVitalIdShareSnapshotKey(id, 'sentTo', updated as unknown as Json);
  return stored ? { ...payload, sentTo: updated } : null;
}

export async function listShares(): Promise<SharePayload[]> {
  const rows = await store().listVitalIdShares();
  return rows.map(toPayload);
}

/**
 * Deletes only the caller's shares. Ownership rides inside the stored snapshot
 * (`snapshot->>ownerKey`); legacy rows written before owner tracking have a
 * null key and belong to the demo user.
 */
export async function clearForOwner(ownerKey: string): Promise<void> {
  await store().clearVitalIdSharesForOwner(ownerKey, ownerKey === DEMO_USER_KEY);
}
