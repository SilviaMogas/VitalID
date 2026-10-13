import 'server-only';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isPlanId, planRank, type PlanId } from '@/lib/plans';
import { DEMO_USER_KEY } from './constants';
import type { MembershipRecord, MembershipStore } from './types';
import { applySolReadExpiry } from './sol';

const TABLE = 'vital_id_memberships';

interface Row {
  user_key: string;
  display_name: string | null;
  email: string | null;
  plan: string;
  stripe_customer_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  subscription_period_end: string | null;
  activated_at: string | null;
  plan_chosen_at: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

function toRecord(row: Row): MembershipRecord {
  return applySolReadExpiry({
    userKey: row.user_key,
    displayName: row.display_name,
    email: row.email,
    plan: isPlanId(row.plan) ? row.plan : 'free',
    stripeCustomerId: row.stripe_customer_id,
    stripeCheckoutSessionId: row.stripe_checkout_session_id,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    subscriptionStatus: row.subscription_status,
    subscriptionPeriodEnd: row.subscription_period_end,
    activatedAt: row.activated_at,
    planChosenAt: row.plan_chosen_at,
    onboardingCompletedAt: row.onboarding_completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
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
    stripe_subscription_id: record.stripeSubscriptionId,
    subscription_status: record.subscriptionStatus,
    subscription_period_end: record.subscriptionPeriodEnd,
    activated_at: record.activatedAt,
    plan_chosen_at: record.planChosenAt,
    onboarding_completed_at: record.onboardingCompletedAt,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

function blank(userKey: string, now: string): MembershipRecord {
  return {
    userKey,
    displayName: null,
    email: null,
    plan: 'free',
    stripeCustomerId: null,
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: null,
    stripeSubscriptionId: null,
    subscriptionStatus: null,
    subscriptionPeriodEnd: null,
    activatedAt: null,
    planChosenAt: null,
    onboardingCompletedAt: null,
    createdAt: now,
    updatedAt: now,
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

  private async write(record: MembershipRecord): Promise<MembershipRecord> {
    const { error } = await getSupabaseServerClient()
      .from(TABLE)
      .upsert(toRow(record), { onConflict: 'user_key' });
    if (error) throw new Error(`membership write failed: ${error.message}`);
    return record;
  }

  async upsert(input: { userKey: string; displayName?: string; email?: string }) {
    const existing = await this.get(input.userKey);
    const now = new Date().toISOString();
    if (!existing) {
      const record: MembershipRecord = {
        ...blank(input.userKey, now),
        displayName: input.displayName ?? null,
        email: input.email ?? null,
        // DEMO_DEFAULT_PLAN applies only to the Fatima demo user.
        plan:
          input.userKey === DEMO_USER_KEY && isPlanId(process.env.DEMO_DEFAULT_PLAN)
            ? process.env.DEMO_DEFAULT_PLAN
            : 'free',
      };
      return this.write(record);
    }
    return this.write({
      ...existing,
      displayName: input.displayName ?? existing.displayName,
      email: input.email ?? existing.email,
      updatedAt: now,
    });
  }

  async activatePlan(input: {
    userKey: string;
    plan: Exclude<PlanId, 'free'>;
    stripeCustomerId?: string | null;
    stripeCheckoutSessionId: string;
    stripePaymentIntentId?: string | null;
    stripeSubscriptionId?: string | null;
    subscriptionStatus?: string | null;
    subscriptionPeriodEnd?: string | null;
  }) {
    const existing = await this.get(input.userKey);
    if (existing?.stripeCheckoutSessionId === input.stripeCheckoutSessionId) {
      return existing;
    }
    const now = new Date().toISOString();
    const base = existing ?? blank(input.userKey, now);
    return this.write({
      ...base,
      plan: planRank(input.plan) > planRank(base.plan) ? input.plan : base.plan,
      stripeCustomerId: input.stripeCustomerId ?? base.stripeCustomerId,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
      stripePaymentIntentId: input.stripePaymentIntentId ?? base.stripePaymentIntentId,
      stripeSubscriptionId: input.stripeSubscriptionId ?? base.stripeSubscriptionId,
      subscriptionStatus: input.subscriptionStatus ?? base.subscriptionStatus,
      subscriptionPeriodEnd: input.subscriptionPeriodEnd ?? base.subscriptionPeriodEnd,
      activatedAt: now,
      planChosenAt: base.planChosenAt ?? now,
      updatedAt: now,
    });
  }

  private async findOne(column: 'stripe_subscription_id' | 'stripe_customer_id', value: string) {
    const { data, error } = await getSupabaseServerClient()
      .from(TABLE)
      .select('*')
      .eq(column, value)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`membership lookup failed: ${error.message}`);
    return data ? toRecord(data as Row) : null;
  }

  async syncSubscription(input: {
    stripeSubscriptionId: string;
    stripeCustomerId?: string | null;
    userKey?: string | null;
    plan: Exclude<PlanId, 'free'> | null;
    status: string;
    periodEnd?: string | null;
  }) {
    let existing = await this.findOne('stripe_subscription_id', input.stripeSubscriptionId);
    if (!existing && input.userKey) existing = await this.get(input.userKey);
    if (!existing && input.stripeCustomerId) {
      existing = await this.findOne('stripe_customer_id', input.stripeCustomerId);
    }
    if (!existing) return null;
    const now = new Date().toISOString();
    return this.write({
      ...existing,
      plan: input.plan ?? 'free',
      stripeCustomerId: input.stripeCustomerId ?? existing.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      subscriptionStatus: input.status,
      subscriptionPeriodEnd: input.periodEnd ?? existing.subscriptionPeriodEnd,
      updatedAt: now,
    });
  }

  async reset(userKey: string) {
    const existing = await this.get(userKey);
    const now = new Date().toISOString();
    return this.write({
      ...blank(userKey, now),
      displayName: existing?.displayName ?? null,
      email: existing?.email ?? null,
      createdAt: existing?.createdAt ?? now,
    });
  }

  async markPlanChosen(userKey: string) {
    return this.stamp(userKey, 'planChosenAt');
  }

  async completeOnboarding(userKey: string) {
    return this.stamp(userKey, 'onboardingCompletedAt');
  }

  private async stamp(userKey: string, field: 'planChosenAt' | 'onboardingCompletedAt') {
    const now = new Date().toISOString();
    const base = (await this.get(userKey)) ?? blank(userKey, now);
    return this.write({ ...base, [field]: base[field] ?? now, updatedAt: now });
  }

  async findByEmail(email: string) {
    const { data, error } = await getSupabaseServerClient()
      .from(TABLE)
      .select('*')
      .ilike('email', email.trim())
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`membership findByEmail failed: ${error.message}`);
    return data ? toRecord(data as Row) : null;
  }
}
