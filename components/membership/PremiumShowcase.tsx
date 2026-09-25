"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import { useMembership } from "@/components/providers/MembershipProvider";
import { hasFeature, type Feature } from "@/lib/plans";
import { useConnectorSelection } from "@/lib/connectors-state";
import type { TranslationKey } from "@/lib/i18n";
import { SectionTitle } from "@/components/vital-id/VitalIdSections";
import { LockIcon, UpgradeChip } from "./UpgradeChip";

/** "Included in your plan" section listing gated capabilities on the Vital ID page. */
export function PremiumShowcase() {
  const { t } = useLocale();
  const { plan, loading } = useMembership();
  const { count, limit, ready } = useConnectorSelection();

  if (loading || !ready) return null;

  const used = count;

  const items: { feature: Feature; titleKey: TranslationKey; descKey: TranslationKey }[] = [
    { feature: "advancedInsights", titleKey: "membership.showcase.advancedInsights", descKey: "membership.showcase.advancedInsightsDesc" },
    { feature: "nutrition", titleKey: "membership.showcase.nutrition", descKey: "membership.showcase.nutritionDesc" },
    { feature: "caregiverAccess", titleKey: "membership.showcase.caregiver", descKey: "membership.showcase.caregiverDesc" },
    { feature: "advancedConsent", titleKey: "membership.showcase.consent", descKey: "membership.showcase.consentDesc" },
    { feature: "completeTimeline", titleKey: "membership.showcase.timeline", descKey: "membership.showcase.timelineDesc" },
  ];

  return (
    <div className="card p-5">
      <SectionTitle>{t("membership.showcase.title")}</SectionTitle>

      {/* Connectors usage */}
      <div className="mt-3 rounded-xl border border-line bg-canvas/50 p-3">
        <p className="text-sm font-medium">{t("membership.showcase.connectors")}</p>
        <p className="mt-0.5 text-xs text-muted">
          {limit === null
            ? t("membership.showcase.connectorsUnlimited", { used })
            : t("membership.showcase.connectorsUsed", { used, limit })}
        </p>
        {limit !== null && used > limit && (
          <p className="mt-1 text-xs text-warn">{t("membership.showcase.connectorsOver")}</p>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {items.map(({ feature, titleKey, descKey }) => {
          const unlocked = hasFeature(plan, feature);
          return (
            <div
              key={feature}
              className={`flex items-start gap-3 rounded-xl border p-3 ${
                unlocked ? "border-line bg-canvas/50" : "border-dashed border-line"
              }`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                  unlocked ? "bg-brand-soft text-brand" : "bg-canvas text-muted"
                }`}
              >
                <LockIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t(titleKey)}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {unlocked ? t("membership.showcase.active") : t(descKey)}
                </p>
                {!unlocked && feature !== "advancedInsights" && (
                  <div className="mt-2">
                    <UpgradeChip plan="pro" />
                  </div>
                )}
                {!unlocked && feature === "advancedInsights" && (
                  <div className="mt-2">
                    <UpgradeChip plan="plus" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
