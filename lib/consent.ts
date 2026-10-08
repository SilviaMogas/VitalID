import 'server-only';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Consent audit store: append-only record of privacy-policy acceptances and
 * explicit health-data consents (GDPR Art. 9(2)(a)). Supabase when configured,
 * in-memory otherwise (dev without env). Keyed by Supabase Auth user id.
 */

export const CONSENT_TYPES = ['privacy_policy', 'terms_of_service', 'health_data'] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

export function isConsentType(v: unknown): v is ConsentType {
  return typeof v === 'string' && (CONSENT_TYPES as readonly string[]).includes(v);
}

export interface ConsentRecord {
  type: ConsentType;
  policyVersion: string;
  consentedAt: string;
}

export type ConsentMap = Partial<Record<ConsentType, ConsentRecord>>;

interface ConsentStore {
  /** Append a consent event. Returns the stored record (server timestamp). */
  record(userId: string, type: ConsentType, policyVersion: string): Promise<ConsentRecord>;
  /** Latest consent of each type, or null when the user has never consented. */
  latest(userId: string): Promise<ConsentMap | null>;
}

/* ------------------------------------------------------------------ */
/* Memory backend                                                       */
/* ------------------------------------------------------------------ */

class MemoryConsentStore implements ConsentStore {
  private rows = new Map<string, ConsentRecord[]>();
  async record(userId: string, type: ConsentType, policyVersion: string) {
    const rec: ConsentRecord = { type, policyVersion, consentedAt: new Date().toISOString() };
    const list = this.rows.get(userId) ?? [];
    list.push(rec);
    this.rows.set(userId, list);
    return rec;
  }
  async latest(userId: string) {
    const list = this.rows.get(userId);
    if (!list?.length) return null;
    const out: ConsentMap = {};
    for (const rec of list) out[rec.type] = rec; // appended in order → last wins
    return out;
  }
}

/* ------------------------------------------------------------------ */
/* Supabase backend                                                     */
/* ------------------------------------------------------------------ */

interface ConsentRow {
  consent_type: string;
  policy_version: string;
  consented_at: string;
}

class SupabaseConsentStore implements ConsentStore {
  async record(userId: string, type: ConsentType, policyVersion: string) {
    const sb = getSupabaseServerClient();
    const { data, error } = await sb
      .from('vital_id_consents')
      .insert({ user_id: userId, consent_type: type, policy_version: policyVersion })
      .select('consent_type,policy_version,consented_at')
      .single();
    if (error) throw new Error(`consent save failed: ${error.message}`);
    const row = data as ConsentRow;
    return { type, policyVersion: row.policy_version, consentedAt: row.consented_at };
  }

  async latest(userId: string) {
    const sb = getSupabaseServerClient();
    const { data, error } = await sb
      .from('vital_id_consents')
      .select('consent_type,policy_version,consented_at')
      .eq('user_id', userId)
      .order('consented_at', { ascending: false });
    if (error) throw new Error(`consent read failed: ${error.message}`);
    if (!data?.length) return null;
    const out: ConsentMap = {};
    for (const row of data as ConsentRow[]) {
      if (!isConsentType(row.consent_type)) continue;
      // Ordered desc → first occurrence per type is the latest.
      out[row.consent_type] ??= {
        type: row.consent_type,
        policyVersion: row.policy_version,
        consentedAt: row.consented_at,
      };
    }
    return Object.keys(out).length ? out : null;
  }
}

interface StoreGlobal {
  __vitalIdConsentStore?: { backend: 'supabase' | 'memory'; store: ConsentStore };
}

export function getConsentStore(): ConsentStore {
  const g = globalThis as StoreGlobal;
  const backend = isSupabaseConfigured() ? 'supabase' : 'memory';
  if (g.__vitalIdConsentStore?.backend === backend) return g.__vitalIdConsentStore.store;
  const store = backend === 'supabase' ? new SupabaseConsentStore() : new MemoryConsentStore();
  g.__vitalIdConsentStore = { backend, store };
  return store;
}
