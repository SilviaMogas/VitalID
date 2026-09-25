// Central plan/feature config for Vital ID membership.
// Client-safe: no server imports — everything plan-related lives here only.
import type { TranslationKey } from "@/lib/i18n";

export type PlanId = "free" | "plus" | "pro";

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
  /** Price shown on the pricing card. */
  displayPrice: string;
  billingLabelKey: TranslationKey;
  /** Hackathon demo charge in cents; null for free (free never calls Stripe). */
  demoChargeCents: number | null;
  /** Env var name holding the one-time $1 demo Price ID; null for free. */
  demoPriceEnvKey: "STRIPE_PLUS_DEMO_PRICE_ID" | "STRIPE_PRO_DEMO_PRICE_ID" | null;
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
    displayPrice: "$0",
    billingLabelKey: "pricing.billing.free",
    demoChargeCents: null,
    demoPriceEnvKey: null,
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
    displayPrice: "$10",
    billingLabelKey: "pricing.billing.monthly",
    demoChargeCents: 100,
    demoPriceEnvKey: "STRIPE_PLUS_DEMO_PRICE_ID",
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
    displayPrice: "$25",
    billingLabelKey: "pricing.billing.monthly",
    demoChargeCents: 100,
    demoPriceEnvKey: "STRIPE_PRO_DEMO_PRICE_ID",
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

export const DEMO_CHARGE_CENTS = 100;
export const DEMO_CURRENCY = "usd";

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
