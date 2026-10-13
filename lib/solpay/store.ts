import 'server-only';
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type { BillingInterval } from '@/lib/plans';
import type { SolCluster } from './config';

const TABLE = 'vital_id_sol_payments';

export interface SolPayment {
  reference: string;
  userKey: string;
  plan: 'plus' | 'pro';
  interval: BillingInterval;
  lamports: string;
  treasury: string;
  cluster: SolCluster;
  status: 'pending' | 'paid';
  signature: string | null;
  payer: string | null;
  expiresAt: string;
  createdAt: string;
  confirmedAt: string | null;
}

export type ClaimResult = 'claimed' | 'already-paid' | 'signature-used' | 'missing';

export interface SolPaymentStore {
  create(payment: SolPayment): Promise<void>;
  get(reference: string): Promise<SolPayment | null>;
  /**
   * Atomically marks a pending payment as paid by `signature`. Returns
   * 'signature-used' when that signature already settled another request,
   * 'already-paid' when this reference was settled before.
   */
  claimSignature(reference: string, signature: string, payer: string | null): Promise<ClaimResult>;
  /**
   * True when a request for the same user ordered after this one was already
   * claimed. Ordering is (createdAt, reference) — a deterministic total order
   * — so only the newest claimed request may activate, regardless of settle
   * order, re-polls, or concurrent confirmations.
   */
  hasNewerClaimed(payment: SolPayment): Promise<boolean>;
}

interface Row {
  reference: string;
  user_key: string;
  plan: string;
  interval: string;
  lamports: number;
  treasury: string;
  cluster: string;
  status: string;
  signature: string | null;
  payer: string | null;
  expires_at: string;
  created_at: string;
  confirmed_at: string | null;
}

function toRecord(row: Row): SolPayment {
  return {
    reference: row.reference,
    userKey: row.user_key,
    plan: row.plan === 'pro' ? 'pro' : 'plus',
    interval: row.interval === 'annual' ? 'annual' : 'monthly',
    lamports: String(row.lamports),
    treasury: row.treasury,
    cluster: (row.cluster === 'mainnet-beta' || row.cluster === 'testnet'
      ? row.cluster
      : 'devnet') as SolCluster,
    status: row.status === 'paid' ? 'paid' : 'pending',
    signature: row.signature,
    payer: row.payer,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at,
  };
}

class SupabaseSolPaymentStore implements SolPaymentStore {
  async create(payment: SolPayment) {
    // Keep createdAt strictly increasing per user so request order never
    // collapses to the reference tiebreak on same-millisecond creates.
    const { data: latest } = await getSupabaseServerClient()
      .from(TABLE)
      .select('created_at')
      .eq('user_key', payment.userKey)
      .order('created_at', { ascending: false })
      .limit(1);
    const last = Array.isArray(latest) && latest.length > 0 ? String(latest[0].created_at) : null;
    const createdAt =
      last !== null && payment.createdAt <= last
        ? new Date(Date.parse(last) + 1).toISOString()
        : payment.createdAt;
    const { error } = await getSupabaseServerClient()
      .from(TABLE)
      .insert({
        reference: payment.reference,
        user_key: payment.userKey,
        plan: payment.plan,
        interval: payment.interval,
        lamports: Number(payment.lamports),
        treasury: payment.treasury,
        cluster: payment.cluster,
        status: payment.status,
        signature: payment.signature,
        payer: payment.payer,
        expires_at: payment.expiresAt,
        created_at: createdAt,
        confirmed_at: payment.confirmedAt,
      });
    if (error) throw new Error(`sol payment create failed: ${error.message}`);
  }

  async get(reference: string): Promise<SolPayment | null> {
    const { data, error } = await getSupabaseServerClient()
      .from(TABLE)
      .select('*')
      .eq('reference', reference)
      .maybeSingle();
    if (error) throw new Error(`sol payment get failed: ${error.message}`);
    return data ? toRecord(data as Row) : null;
  }

  async claimSignature(reference: string, signature: string, payer: string | null): Promise<ClaimResult> {
    const { data, error } = await getSupabaseServerClient()
      .from(TABLE)
      .update({
        signature,
        payer,
        status: 'paid',
        confirmed_at: new Date().toISOString(),
      })
      .eq('reference', reference)
      .is('signature', null)
      .select('reference');
    if (error) {
      // Unique index on signature → another request already settled with it.
      if (error.code === '23505') return 'signature-used';
      throw new Error(`sol payment claim failed: ${error.message}`);
    }
    if (Array.isArray(data) && data.length > 0) return 'claimed';
    const current = await this.get(reference);
    if (!current) return 'missing';
    return current.signature === signature ? 'already-paid' : 'signature-used';
  }

  async hasNewerClaimed(payment: SolPayment): Promise<boolean> {
    const { data, error } = await getSupabaseServerClient()
      .from(TABLE)
      .select('reference')
      .eq('user_key', payment.userKey)
      .not('signature', 'is', null)
      .or(
        `created_at.gt.${payment.createdAt},and(created_at.eq.${payment.createdAt},reference.gt.${payment.reference})`,
      )
      .limit(1);
    if (error) throw new Error(`sol payment ordering failed: ${error.message}`);
    return Array.isArray(data) && data.length > 0;
  }
}

interface MemoryGlobal {
  __vitalIdSolPayments?: Map<string, SolPayment>;
  __vitalIdSolSignatures?: Set<string>;
}

class MemorySolPaymentStore implements SolPaymentStore {
  private payments(): Map<string, SolPayment> {
    const g = globalThis as MemoryGlobal;
    g.__vitalIdSolPayments ??= new Map();
    return g.__vitalIdSolPayments;
  }

  private usedSignatures(): Set<string> {
    const g = globalThis as MemoryGlobal;
    g.__vitalIdSolSignatures ??= new Set();
    return g.__vitalIdSolSignatures;
  }

  async create(payment: SolPayment) {
    const map = this.payments();
    if (map.has(payment.reference)) throw new Error('sol payment reference collision');
    // Strictly increasing createdAt per user (see SupabaseSolPaymentStore).
    let last: string | null = null;
    for (const record of map.values()) {
      if (record.userKey === payment.userKey && (last === null || record.createdAt > last)) {
        last = record.createdAt;
      }
    }
    const createdAt =
      last !== null && payment.createdAt <= last
        ? new Date(Date.parse(last) + 1).toISOString()
        : payment.createdAt;
    map.set(payment.reference, structuredClone({ ...payment, createdAt }));
  }

  async get(reference: string) {
    const record = this.payments().get(reference);
    return record ? structuredClone(record) : null;
  }

  async claimSignature(reference: string, signature: string, payer: string | null): Promise<ClaimResult> {
    const record = this.payments().get(reference);
    if (!record) return 'missing';
    if (record.signature) return record.signature === signature ? 'already-paid' : 'signature-used';
    if (this.usedSignatures().has(signature)) return 'signature-used';
    this.usedSignatures().add(signature);
    this.payments().set(reference, {
      ...record,
      signature,
      payer,
      status: 'paid',
      confirmedAt: new Date().toISOString(),
    });
    return 'claimed';
  }

  async hasNewerClaimed(payment: SolPayment): Promise<boolean> {
    for (const record of this.payments().values()) {
      if (
        record.userKey === payment.userKey &&
        record.signature !== null &&
        (record.createdAt > payment.createdAt ||
          (record.createdAt === payment.createdAt && record.reference > payment.reference))
      ) {
        return true;
      }
    }
    return false;
  }
}

interface StoreGlobal {
  __vitalIdSolPaymentStoreInstance?: { backend: 'supabase' | 'memory'; store: SolPaymentStore };
}

export function getSolPaymentStore(): SolPaymentStore {
  const g = globalThis as StoreGlobal;
  const backend: 'supabase' | 'memory' =
    process.env.SOL_PAYMENT_STORE === 'memory'
      ? 'memory'
      : process.env.SOL_PAYMENT_STORE === 'supabase' || isSupabaseConfigured()
        ? 'supabase'
        : 'memory';
  if (g.__vitalIdSolPaymentStoreInstance?.backend === backend) {
    return g.__vitalIdSolPaymentStoreInstance.store;
  }
  const store = backend === 'supabase' ? new SupabaseSolPaymentStore() : new MemorySolPaymentStore();
  g.__vitalIdSolPaymentStoreInstance = { backend, store };
  return store;
}
