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
  /** Set when the user picks any plan (free or paid). */
  planChosenAt: string | null;
  /** Set when the post-signup intro is finished. */
  onboardingCompletedAt: string | null;
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
  /** Marks that the user picked a plan (free or paid). */
  markPlanChosen(userKey: string): Promise<MembershipRecord>;
  /** Marks the post-signup intro as finished. */
  completeOnboarding(userKey: string): Promise<MembershipRecord>;
  /** Case-insensitive email lookup for demo sign-in. */
  findByEmail(email: string): Promise<MembershipRecord | null>;
}
