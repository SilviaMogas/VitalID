import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CreateVitalIdShareInput,
  GetVitalIdShareResult,
  Json,
  ShareStore,
  VitalIdShareRecord,
} from '@/lib/share-storage/types';
import {
  buildShareRecord,
  invalidReason,
  isVitalIdShareValid,
  stripSnapshot,
} from '@/lib/share-storage/shared';
import { getSupabaseServerClient } from './server';

export const VITAL_ID_SHARES_TABLE = 'vital_id_shares';

/** Row shape of `public.vital_id_shares`. */
interface VitalIdShareRow {
  id: string;
  token: string;
  created_at: string;
  expires_at: string;
  revoked: boolean;
  purpose: string | null;
  selected_fields: string[];
  snapshot: Record<string, Json>;
}

const LIST_PAGE_SIZE = 500;
const SUMMARY_COLUMNS = 'id, token, created_at, expires_at, revoked, purpose, selected_fields, sentTo:snapshot->sentTo';

function fromRow(row: VitalIdShareRow): VitalIdShareRecord {
  return {
    id: row.id,
    token: row.token,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revoked: row.revoked,
    purpose: row.purpose,
    selectedFields: row.selected_fields ?? [],
    snapshot: row.snapshot ?? {},
  };
}

function toRow(r: VitalIdShareRecord): VitalIdShareRow {
  return {
    id: r.id,
    token: r.token,
    created_at: r.createdAt,
    expires_at: r.expiresAt,
    revoked: r.revoked,
    purpose: r.purpose,
    selected_fields: r.selectedFields,
    snapshot: r.snapshot,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Supabase-backed ShareStore. Server-only (uses the secret key).
 * RLS is enabled on the table with no public policies, so the anon /
 * publishable key can never read or write shares.
 */
export class SupabaseShareStore implements ShareStore {
  private readonly client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getSupabaseServerClient();
  }

  async createVitalIdShare(input: CreateVitalIdShareInput): Promise<VitalIdShareRecord> {
    const record = buildShareRecord(input);
    const { data, error } = await this.client
      .from(VITAL_ID_SHARES_TABLE)
      .insert(toRow(record))
      .select('*')
      .single<VitalIdShareRow>();
    if (error) throw new Error(`createVitalIdShare failed: ${error.message}`);
    return fromRow(data);
  }

  async getVitalIdShareByToken(token: string): Promise<GetVitalIdShareResult> {
    const { data, error } = await this.client
      .from(VITAL_ID_SHARES_TABLE)
      .select('*')
      .eq('token', token)
      .maybeSingle<VitalIdShareRow>();
    if (error) throw new Error(`getVitalIdShareByToken failed: ${error.message}`);
    if (!data) return { valid: false, reason: 'not_found', share: null };
    const share = fromRow(data);
    const reason = invalidReason(share);
    if (reason) return { valid: false, reason, share: stripSnapshot(share) };
    return { valid: true, share };
  }

  async revokeVitalIdShare(tokenOrId: string): Promise<boolean> {
    const byToken = await this.revokeWhere('token', tokenOrId);
    if (byToken) return true;
    if (!UUID_RE.test(tokenOrId)) return false;
    return this.revokeWhere('id', tokenOrId);
  }

  async setVitalIdShareSnapshotKey(token: string, key: string, value: Json): Promise<boolean> {
    const { data, error } = await this.client
      .from(VITAL_ID_SHARES_TABLE)
      .select('snapshot')
      .eq('token', token)
      .maybeSingle<{ snapshot: Record<string, Json> | null }>();
    if (error) throw new Error(`setVitalIdShareSnapshotKey failed: ${error.message}`);
    if (!data) return false;

    const snapshot = { ...(data.snapshot ?? {}), [key]: value };
    const { data: updated, error: updateError } = await this.client
      .from(VITAL_ID_SHARES_TABLE)
      .update({ snapshot })
      .eq('token', token)
      .select('id');
    if (updateError) throw new Error(`setVitalIdShareSnapshotKey failed: ${updateError.message}`);
    return (updated?.length ?? 0) > 0;
  }

  private async revokeWhere(column: 'token' | 'id', value: string): Promise<boolean> {
    const { data, error } = await this.client
      .from(VITAL_ID_SHARES_TABLE)
      .update({ revoked: true })
      .eq(column, value)
      .select('id');
    if (error) throw new Error(`revokeVitalIdShare failed: ${error.message}`);
    return (data?.length ?? 0) > 0;
  }

  isVitalIdShareValid(record: VitalIdShareRecord, now?: Date): boolean {
    return isVitalIdShareValid(record, now);
  }

  async listVitalIdShares() {
    const rows: (Omit<VitalIdShareRow, 'snapshot'> & { sentTo?: Json })[] = [];
    for (let from = 0; ; from += LIST_PAGE_SIZE) {
      const { data, error } = await this.client
        .from(VITAL_ID_SHARES_TABLE)
        .select(SUMMARY_COLUMNS)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, from + LIST_PAGE_SIZE - 1)
        .returns<(Omit<VitalIdShareRow, 'snapshot'> & { sentTo?: Json })[]>();
      if (error) throw new Error(`listVitalIdShares failed: ${error.message}`);
      rows.push(...(data ?? []));
      if (!data || data.length < LIST_PAGE_SIZE) break;
    }
    return rows.map((row) => ({
      id: row.id,
      token: row.token,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      revoked: row.revoked,
      purpose: row.purpose,
      selectedFields: row.selected_fields ?? [],
      sentTo: row.sentTo,
    }));
  }

  async clearVitalIdShares(): Promise<void> {
    const { error } = await this.client
      .from(VITAL_ID_SHARES_TABLE)
      .delete()
      .not('id', 'is', null);
    if (error) throw new Error(`clearVitalIdShares failed: ${error.message}`);
  }
}
