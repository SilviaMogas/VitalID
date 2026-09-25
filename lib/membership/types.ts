import type { PlanId } from "@/lib/plans";

/** A membership row exactly as stored (mirrors `vital_id_memberships`). */
export interface MembershipRecord {
  userKey: string;
  displayName: string | null;
  email: string | null;
  plan: PlanId;
  stripeCustomerId: string | null;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  activatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipStore {
  /** Returns null when the user has no row yet. */
  get(userKey: string): Promise<MembershipRecord | null>;
  /**
   * Creates a free row if missing; never downgrades an existing plan.
   * displayName/email are filled when provided.
   */
  upsert(input: { userKey: string; displayName?: string; email?: string }): Promise<MembershipRecord>;
  /**
   * Idempotent: a record whose stripeCheckoutSessionId already matches is a no-op.
   * Never downgrades (pro -> plus is a no-op for plan but still stamps stripe fields).
   */
  activatePlan(input: {
    userKey: string;
    plan: Exclude<PlanId, "free">;
    stripeCustomerId?: string | null;
    stripeCheckoutSessionId: string;
    stripePaymentIntentId?: string | null;
  }): Promise<MembershipRecord>;
  /** Demo reset: back to free, clears stripe fields. */
  reset(userKey: string): Promise<MembershipRecord>;
}
