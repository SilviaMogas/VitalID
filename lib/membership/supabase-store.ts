import 'server-only';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isPlanId, planRank, type PlanId } from '@/lib/plans';
import type { MembershipRecord, MembershipStore } from './types';

const TABLE = 'vital_id_memberships';

interface Row {
  user_key: string;
  display_name: string | null;
  email: string | null;
  plan: string;
  stripe_customer_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
}

function toRecord(row: Row): MembershipRecord {
  return {
    userKey: row.user_key,
    displayName: row.display_name,
    email: row.email,
    plan: isPlanId(row.plan) ? row.plan : 'free',
    stripeCustomerId: row.stripe_customer_id,
    stripeCheckoutSessionId: row.stripe_checkout_session_id,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    activatedAt: row.activated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(record: MembershipRecord): Row {
  return {
    user_key: record.userKey,
    display_name: record.displayName,
    email: record.email,
    plan: record.plan,
    stripe_customer_id: record.stripeCustomerId,
    stripe_checkout_session_id: record.stripeCheckoutSessionId,
    stripe_payment_intent_id: record.stripePaymentIntentId,
    activated_at: record.activatedAt,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

export class SupabaseMembershipStore implements MembershipStore {
  async get(userKey: string): Promise<MembershipRecord | null> {
    const { data, error } = await getSupabaseServerClient()
      .from(TABLE)
      .select('*')
      .eq('user_key', userKey)
      .maybeSingle();
    if (error) throw new Error(`membership get failed: ${error.message}`);
    return data ? toRecord(data as Row) : null;
  }

  async upsert(input: { userKey: string; displayName?: string; email?: string }) {
    const existing = await this.get(input.userKey);
    const now = new Date().toISOString();
    if (!existing) {
      const record: MembershipRecord = {
        userKey: input.userKey,
        displayName: input.displayName ?? null,
        email: input.email ?? null,
        plan: isPlanId(process.env.DEMO_DEFAULT_PLAN) ? (process.env.DEMO_DEFAULT_PLAN as PlanId) : 'free',
        stripeCustomerId: null,
        stripeCheckoutSessionId: null,
        stripePaymentIntentId: null,
        activatedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      const { error } = await getSupabaseServerClient().from(TABLE).insert(toRow(record));
      if (error) throw new Error(`membership insert failed: ${error.message}`);
      return record;
    }
    const updated: MembershipRecord = {
      ...existing,
      displayName: input.displayName ?? existing.displayName,
      email: input.email ?? existing.email,
      updatedAt: now,
    };
    const { error } = await getSupabaseServerClient()
      .from(TABLE)
      .update(toRow(updated))
      .eq('user_key', input.userKey);
    if (error) throw new Error(`membership update failed: ${error.message}`);
    return updated;
  }

  async activatePlan(input: {
    userKey: string;
    plan: Exclude<PlanId, 'free'>;
    stripeCustomerId?: string | null;
    stripeCheckoutSessionId: string;
    stripePaymentIntentId?: string | null;
  }) {
    const existing = await this.get(input.userKey);
    if (existing?.stripeCheckoutSessionId === input.stripeCheckoutSessionId) {
      return existing;
    }
    const now = new Date().toISOString();
    const base: MembershipRecord =
      existing ??
      ({
        userKey: input.userKey,
        displayName: null,
        email: null,
        plan: 'free',
        stripeCustomerId: null,
        stripeCheckoutSessionId: null,
        stripePaymentIntentId: null,
        activatedAt: null,
        createdAt: now,
        updatedAt: now,
      } satisfies MembershipRecord);
    const record: MembershipRecord = {
      ...base,
      plan: planRank(input.plan) > planRank(base.plan) ? input.plan : base.plan,
      stripeCustomerId: input.stripeCustomerId ?? base.stripeCustomerId,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
      stripePaymentIntentId: input.stripePaymentIntentId ?? base.stripePaymentIntentId,
      activatedAt: now,
      updatedAt: now,
    };
    const { error } = await getSupabaseServerClient()
      .from(TABLE)
      .upsert(toRow(record), { onConflict: 'user_key' });
    if (error) throw new Error(`membership activate failed: ${error.message}`);
    return record;
  }

  async reset(userKey: string) {
    const existing = await this.get(userKey);
    const now = new Date().toISOString();
    const record: MembershipRecord = {
      userKey,
      displayName: existing?.displayName ?? null,
      email: existing?.email ?? null,
      plan: 'free',
      stripeCustomerId: null,
      stripeCheckoutSessionId: null,
      stripePaymentIntentId: null,
      activatedAt: null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const { error } = await getSupabaseServerClient()
      .from(TABLE)
      .upsert(toRow(record), { onConflict: 'user_key' });
    if (error) throw new Error(`membership reset failed: ${error.message}`);
    return record;
  }
}
