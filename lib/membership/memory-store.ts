import { isPlanId, planRank, type PlanId } from "@/lib/plans";
import { DEMO_USER_KEY } from "./constants";
import type { MembershipRecord, MembershipStore } from "./types";
import { applySolReadExpiry, hasLiveStripeSubscription, SOL_SESSION_PREFIX } from "./sol";

interface MemoryGlobal {
  __vitalIdMembershipStore?: Map<string, MembershipRecord>;
}

/**
 * In-process fallback used when Supabase credentials are absent.
 * Backed by a Map on globalThis so it survives Next.js dev HMR reloads.
 * Data is lost on server restart — fine for local dev / demos.
 */
export class MemoryMembershipStore implements MembershipStore {
  private readonly map: Map<string, MembershipRecord>;

  constructor(map?: Map<string, MembershipRecord>) {
    const g = globalThis as MemoryGlobal;
    if (map) {
      this.map = map;
    } else {
      g.__vitalIdMembershipStore ??= new Map();
      this.map = g.__vitalIdMembershipStore;
    }
  }

  async get(userKey: string): Promise<MembershipRecord | null> {
    const record = this.map.get(userKey);
    return record ? applySolReadExpiry(structuredClone(record)) : null;
  }

  private blank(userKey: string, now: string): MembershipRecord {
    return {
      userKey,
      displayName: null,
      email: null,
      plan: "free",
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

  async upsert(input: { userKey: string; displayName?: string; email?: string }) {
    const stored = this.map.get(input.userKey);
    const existing = stored ? applySolReadExpiry(stored) : undefined;
    const now = new Date().toISOString();
    if (!existing) {
      const record = { ...this.blank(input.userKey, now), plan: defaultPlan(input.userKey) };
      record.displayName = input.displayName ?? null;
      record.email = input.email ?? null;
      this.map.set(input.userKey, record);
      return structuredClone(record);
    }
    const updated: MembershipRecord = {
      ...existing,
      displayName: input.displayName ?? existing.displayName,
      email: input.email ?? existing.email,
      updatedAt: now,
    };
    this.map.set(input.userKey, updated);
    return structuredClone(updated);
  }

  async activatePlan(input: {
    userKey: string;
    plan: Exclude<PlanId, "free">;
    stripeCustomerId?: string | null;
    stripeCheckoutSessionId: string;
    stripePaymentIntentId?: string | null;
    stripeSubscriptionId?: string | null;
    subscriptionStatus?: string | null;
    subscriptionPeriodEnd?: string | null;
  }) {
    const now = new Date().toISOString();
    const stored = this.map.get(input.userKey);
    const existing = stored ? applySolReadExpiry(stored) : undefined;
    if (existing?.stripeCheckoutSessionId === input.stripeCheckoutSessionId) {
      return structuredClone(existing);
    }
    const base = existing ?? this.blank(input.userKey, now);
    // A SOL activation must not clobber a live Stripe subscription's state —
    // Stripe webhooks own status/period for stripe-managed members.
    const stripeManaged =
      input.stripeCheckoutSessionId.startsWith(SOL_SESSION_PREFIX) && hasLiveStripeSubscription(base);
    const record: MembershipRecord = {
      ...base,
      plan: planRank(input.plan) > planRank(base.plan) ? input.plan : base.plan,
      stripeCustomerId: input.stripeCustomerId ?? base.stripeCustomerId,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
      stripePaymentIntentId: input.stripePaymentIntentId ?? base.stripePaymentIntentId,
      stripeSubscriptionId: input.stripeSubscriptionId ?? base.stripeSubscriptionId,
      subscriptionStatus: stripeManaged
        ? base.subscriptionStatus
        : (input.subscriptionStatus ?? base.subscriptionStatus),
      subscriptionPeriodEnd: stripeManaged
        ? base.subscriptionPeriodEnd
        : (input.subscriptionPeriodEnd ?? base.subscriptionPeriodEnd),
      activatedAt: now,
      planChosenAt: base.planChosenAt ?? now,
      updatedAt: now,
    };
    this.map.set(input.userKey, record);
    return structuredClone(record);
  }

  // Same semantics as vital_id_sol_activate in Postgres — additive days and
  // highest-plan-rank, deduped by sessionId. Serial in memory by nature.
  async activateSol(input: {
    userKey: string;
    plan: Exclude<PlanId, "free">;
    extendDays: number;
    sessionId: string;
    payer: string | null;
  }) {
    const now = new Date();
    const stored = this.map.get(input.userKey);
    const existing = stored ? applySolReadExpiry(stored) : undefined;
    if (existing?.stripeCheckoutSessionId === input.sessionId) {
      return structuredClone(existing);
    }
    const nowIso = now.toISOString();
    const base = existing ?? this.blank(input.userKey, nowIso);
    const stripeManaged = hasLiveStripeSubscription(base);
    const remaining = base.subscriptionPeriodEnd ? Date.parse(base.subscriptionPeriodEnd) : 0;
    const endMs = Math.max(now.getTime(), remaining) + input.extendDays * 86_400_000;
    const record: MembershipRecord = {
      ...base,
      plan: planRank(input.plan) > planRank(base.plan) ? input.plan : base.plan,
      stripeCheckoutSessionId: input.sessionId,
      stripePaymentIntentId: input.payer ?? base.stripePaymentIntentId,
      subscriptionStatus: stripeManaged ? base.subscriptionStatus : 'sol_one_time',
      subscriptionPeriodEnd: stripeManaged
        ? base.subscriptionPeriodEnd
        : new Date(endMs).toISOString(),
      activatedAt: nowIso,
      planChosenAt: base.planChosenAt ?? nowIso,
      updatedAt: nowIso,
    };
    this.map.set(input.userKey, record);
    return structuredClone(record);
  }

  async syncSubscription(input: {
    stripeSubscriptionId: string;
    stripeCustomerId?: string | null;
    userKey?: string | null;
    plan: Exclude<PlanId, "free"> | null;
    status: string;
    periodEnd?: string | null;
  }) {
    let existing: MembershipRecord | undefined;
    for (const record of this.map.values()) {
      if (record.stripeSubscriptionId === input.stripeSubscriptionId) {
        existing = record;
        break;
      }
    }
    if (!existing && input.userKey) existing = this.map.get(input.userKey);
    if (!existing && input.stripeCustomerId) {
      for (const record of this.map.values()) {
        if (record.stripeCustomerId === input.stripeCustomerId) {
          existing = record;
          break;
        }
      }
    }
    if (!existing) return null;
    const now = new Date().toISOString();
    const record: MembershipRecord = {
      ...existing,
      plan: input.plan ?? "free",
      stripeCustomerId: input.stripeCustomerId ?? existing.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      subscriptionStatus: input.status,
      subscriptionPeriodEnd: input.periodEnd ?? existing.subscriptionPeriodEnd,
      updatedAt: now,
    };
    this.map.set(existing.userKey, record);
    return structuredClone(record);
  }

  async reset(userKey: string) {
    const now = new Date().toISOString();
    const existing = this.map.get(userKey);
    const record: MembershipRecord = {
      ...this.blank(userKey, now),
      displayName: existing?.displayName ?? null,
      email: existing?.email ?? null,
      createdAt: existing?.createdAt ?? now,
    };
    this.map.set(userKey, record);
    return structuredClone(record);
  }

  async markPlanChosen(userKey: string) {
    return this.stamp(userKey, "planChosenAt");
  }

  async completeOnboarding(userKey: string) {
    return this.stamp(userKey, "onboardingCompletedAt");
  }

  private async stamp(userKey: string, field: "planChosenAt" | "onboardingCompletedAt") {
    const now = new Date().toISOString();
    const stored = this.map.get(userKey);
    const base = (stored ? applySolReadExpiry(stored) : undefined) ?? this.blank(userKey, now);
    const record: MembershipRecord = { ...base, [field]: base[field] ?? now, updatedAt: now };
    this.map.set(userKey, record);
    return structuredClone(record);
  }

  async findByEmail(email: string) {
    const target = email.trim().toLowerCase();
    for (const record of this.map.values()) {
      if (record.email?.toLowerCase() === target) return applySolReadExpiry(structuredClone(record));
    }
    return null;
  }
}

// DEMO_DEFAULT_PLAN applies only to the Fatima demo user — signups always start free.
function defaultPlan(userKey: string): PlanId {
  const env = process.env.DEMO_DEFAULT_PLAN;
  return userKey === DEMO_USER_KEY && isPlanId(env) ? env : "free";
}
