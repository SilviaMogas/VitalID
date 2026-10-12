// Central plan/feature config for Vital ID membership.
// Client-safe: no server imports — everything plan-related lives here only.
import type { TranslationKey } from "@/lib/i18n";
import type { CompanionName } from "@/lib/companions";

export type PlanId = "free" | "plus" | "pro";

/** Billing interval for paid plans. */
export type BillingInterval = "monthly" | "annual";

export const BILLING_INTERVALS: BillingInterval[] = ["monthly", "annual"];

export function isBillingInterval(x: unknown): x is BillingInterval {
  return x === "monthly" || x === "annual";
}

export const PLAN_ORDER: PlanId[] = ["free", "plus", "pro"];

export type Feature =
  | "dashboard"
  | "basicMetrics"
  | "basicTrends"
  | "basicSharing"
  | "advancedTrends"
  | "qrSharing"
  | "configurableExpiry"
  | "advancedInsights"
  | "detailedHealthProfile"
  | "nutrition"
  | "advancedConsent"
  | "caregiverAccess"
  | "completeTimeline"
  | "priorityIntegrations";

export interface PlanDefinition {
  id: PlanId;
  nameKey: TranslationKey;
  /** Avatar shown for this plan across the membership UI. */
  companion: CompanionName;
  /** Monthly price shown on the pricing card. */
  displayPrice: string;
  /** Annual price shown on the pricing card (billed once per year). */
  displayPriceAnnual: string;
  billingLabelKey: TranslationKey;
  /** Env var names holding the recurring Stripe Price IDs per interval; null for free. */
  priceEnvKey: {
    monthly: "STRIPE_PRICE_PLUS_MONTHLY" | "STRIPE_PRICE_PRO_MONTHLY";
    annual: "STRIPE_PRICE_PLUS_ANNUAL" | "STRIPE_PRICE_PRO_ANNUAL";
  } | null;
  features: Feature[];
  /** null = unlimited */
  connectorLimit: number | null;
  /** Bullet list shown on the pricing card. */
  featureKeys: TranslationKey[];
  recommended?: boolean;
}

const FREE_FEATURES: Feature[] = ["dashboard", "basicMetrics", "basicTrends", "basicSharing"];
const PLUS_FEATURES: Feature[] = [
  ...FREE_FEATURES,
  "advancedTrends",
  "qrSharing",
  "configurableExpiry",
  "advancedInsights",
  "detailedHealthProfile",
];
const PRO_FEATURES: Feature[] = [
  ...PLUS_FEATURES,
  "nutrition",
  "advancedConsent",
  "caregiverAccess",
  "completeTimeline",
  "priorityIntegrations",
];

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    nameKey: "pricing.plan.free.name",
    companion: "shield",
    displayPrice: "$0",
    displayPriceAnnual: "$0",
    billingLabelKey: "pricing.billing.free",
    priceEnvKey: null,
    features: FREE_FEATURES,
    connectorLimit: 2,
    featureKeys: [
      "pricing.feature.free.vitalId",
      "pricing.feature.free.dashboard",
      "pricing.feature.free.basicMetrics",
      "pricing.feature.free.basicTrends",
      "pricing.feature.free.basicSharing",
      "pricing.feature.free.connectors",
    ],
  },
  plus: {
    id: "plus",
    nameKey: "pricing.plan.plus.name",
    companion: "heart",
    displayPrice: "$10",
    displayPriceAnnual: "$96",
    billingLabelKey: "pricing.billing.monthly",
    priceEnvKey: {
      monthly: "STRIPE_PRICE_PLUS_MONTHLY",
      annual: "STRIPE_PRICE_PLUS_ANNUAL",
    },
    features: PLUS_FEATURES,
    connectorLimit: 5,
    recommended: true,
    featureKeys: [
      "pricing.feature.plus.everythingFree",
      "pricing.feature.plus.connectors",
      "pricing.feature.plus.advancedTrends",
      "pricing.feature.plus.qrSharing",
      "pricing.feature.plus.configurableExpiry",
      "pricing.feature.plus.advancedInsights",
      "pricing.feature.plus.detailedHealthProfile",
    ],
  },
  pro: {
    id: "pro",
    nameKey: "pricing.plan.pro.name",
    companion: "muscle",
    displayPrice: "$25",
    displayPriceAnnual: "$240",
    billingLabelKey: "pricing.billing.monthly",
    priceEnvKey: {
      monthly: "STRIPE_PRICE_PRO_MONTHLY",
      annual: "STRIPE_PRICE_PRO_ANNUAL",
    },
    features: PRO_FEATURES,
    connectorLimit: null,
    featureKeys: [
      "pricing.feature.pro.everythingPlus",
      "pricing.feature.pro.connectors",
      "pricing.feature.pro.nutrition",
      "pricing.feature.pro.advancedConsent",
      "pricing.feature.pro.caregiverAccess",
      "pricing.feature.pro.completeTimeline",
      "pricing.feature.pro.priorityIntegrations",
    ],
  },
};

export const PAID_PLANS: Exclude<PlanId, "free">[] = ["plus", "pro"];

export const BILLING_CURRENCY = "usd";

export function isPlanId(x: unknown): x is PlanId {
  return x === "free" || x === "plus" || x === "pro";
}

export function hasFeature(plan: PlanId, feature: Feature): boolean {
  return PLANS[plan].features.includes(feature);
}

export function canUseFeature(plan: PlanId, feature: Feature): boolean {
  return hasFeature(plan, feature);
}

export function getConnectorLimit(plan: PlanId): number | null {
  return PLANS[plan].connectorLimit;
}

export function requiredPlanFor(feature: Feature): PlanId {
  for (const plan of PLAN_ORDER) {
    if (hasFeature(plan, feature)) return plan;
  }
  return "pro";
}

export function planRank(plan: PlanId): number {
  return PLAN_ORDER.indexOf(plan);
}
