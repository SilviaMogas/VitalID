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
  /** Stripe Subscription id when the plan comes from `mode:"subscription"` checkout. */
  stripeSubscriptionId: string | null;
  /** Last known Stripe subscription status (active, trialing, past_due, canceled, …). */
  subscriptionStatus: string | null;
  /** End of the current paid period (ISO) — access runs until then when cancelling. */
  subscriptionPeriodEnd: string | null;
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
    stripeSubscriptionId?: string | null;
    subscriptionStatus?: string | null;
    subscriptionPeriodEnd?: string | null;
  }): Promise<MembershipRecord>;
  /**
   * Applies a Stripe subscription state to whichever member owns it (lookup by
   * subscription id, then userKey, then customer id). `plan` is the paid plan
   * to grant while the subscription is active; pass null to downgrade to free.
   * Returns the updated record, or null when no member claims the subscription.
   */
  syncSubscription(input: {
    stripeSubscriptionId: string;
    stripeCustomerId?: string | null;
    userKey?: string | null;
    plan: Exclude<PlanId, "free"> | null;
    status: string;
    periodEnd?: string | null;
  }): Promise<MembershipRecord | null>;
  /** Demo reset: back to free, clears stripe fields. */
  reset(userKey: string): Promise<MembershipRecord>;
  /** Marks that the user picked a plan (free or paid). */
  markPlanChosen(userKey: string): Promise<MembershipRecord>;
  /** Marks the post-signup intro as finished. */
  completeOnboarding(userKey: string): Promise<MembershipRecord>;
  /** Case-insensitive email lookup for demo sign-in. */
  findByEmail(email: string): Promise<MembershipRecord | null>;
}
