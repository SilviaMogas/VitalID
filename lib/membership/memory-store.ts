import { isPlanId, planRank, type PlanId } from "@/lib/plans";
import { DEMO_USER_KEY } from "./constants";
import type { MembershipRecord, MembershipStore } from "./types";

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
    return record ? structuredClone(record) : null;
  }

  async upsert(input: { userKey: string; displayName?: string; email?: string }) {
    const existing = this.map.get(input.userKey);
    const now = new Date().toISOString();
    if (!existing) {
      const record: MembershipRecord = {
        userKey: input.userKey,
        displayName: input.displayName ?? null,
        email: input.email ?? null,
        plan: defaultPlan(input.userKey),
        stripeCustomerId: null,
        stripeCheckoutSessionId: null,
        stripePaymentIntentId: null,
        activatedAt: null,
        createdAt: now,
        updatedAt: now,
      };
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
  }) {
    const now = new Date().toISOString();
    const existing = this.map.get(input.userKey);
    if (existing?.stripeCheckoutSessionId === input.stripeCheckoutSessionId) {
      return structuredClone(existing);
    }
    const base: MembershipRecord =
      existing ??
      ({
        userKey: input.userKey,
        displayName: null,
        email: null,
        plan: "free",
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
    this.map.set(input.userKey, record);
    return structuredClone(record);
  }

  async reset(userKey: string) {
    const now = new Date().toISOString();
    const existing = this.map.get(userKey);
    const record: MembershipRecord = {
      userKey,
      displayName: existing?.displayName ?? null,
      email: existing?.email ?? null,
      plan: "free",
      stripeCustomerId: null,
      stripeCheckoutSessionId: null,
      stripePaymentIntentId: null,
      activatedAt: null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.map.set(userKey, record);
    return structuredClone(record);
  }
}

// DEMO_DEFAULT_PLAN applies only to the Fatima demo user — signups always start free.
function defaultPlan(userKey: string): PlanId {
  const env = process.env.DEMO_DEFAULT_PLAN;
  return userKey === DEMO_USER_KEY && isPlanId(env) ? env : "free";
}
