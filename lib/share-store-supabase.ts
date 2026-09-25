import 'server-only';
import type { Json } from '@/lib/share-storage/types';
import { SupabaseShareStore } from '@/lib/supabase/shares';
import type { SharePayload, SharePurpose, ShareField } from './sharing';

/**
 * Adapter that persists Chat B's `SharePayload` in `vital_id_shares` via
 * `SupabaseShareStore`. The public share id doubles as the row `token`;
 * `sharedBy` / `sharedByLocalized` ride along inside the stored snapshot and
 * are split back out on read; `sources` / `lastUpdated` are non-health
 * metadata that `buildSnapshot` always includes for the recipient view.
 */

const META_KEYS = ['sharedBy', 'sharedByLocalized', 'ownerKey', 'sources', 'lastUpdated'] as const;

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
}): SharePayload {
  const { sharedBy, sharedByLocalized, ownerKey, ...rest } = share.snapshot ?? {};
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
    snapshot: rest as SharePayload['snapshot'],
  };
}

export async function createShare(p: SharePayload): Promise<void> {
  const fullSnapshot = {
    ...(p.snapshot as Record<string, Json>),
    sharedBy: p.sharedBy,
    ownerKey: p.ownerKey ?? null,
    sharedByLocalized: (p.sharedByLocalized ?? null) as Json,
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

export async function listShares(): Promise<SharePayload[]> {
  const rows = await store().listVitalIdShares();
  return rows.map(toPayload);
}

export async function clearAll(): Promise<void> {
  await store().clearVitalIdShares();
}
