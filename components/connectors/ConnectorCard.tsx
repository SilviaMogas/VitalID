"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useMembership } from "@/components/providers/MembershipProvider";
import { useConnectorSelection } from "@/lib/connectors-state";
import {
  categoriesOf,
  initialStatusFor,
  type ProviderDef,
} from "@/lib/connectors";
import type { TranslationKey } from "@/lib/i18n";
import { PLANS, planRank } from "@/lib/plans";
import { UpgradeChip, LockIcon } from "@/components/membership/UpgradeChip";
import { ConnectorBadge, ProviderMark } from "@/components/connectors/ConnectorBadge";

export function ConnectorCard({
  provider,
  compact = false,
}: {
  provider: ProviderDef;
  compact?: boolean;
}) {
  const { t } = useLocale();
  const { plan } = useMembership();
  const { connectors, isSelected, toggle, atLimit } = useConnectorSelection();

  const selected = isSelected(provider.id);
  const locked = planRank(provider.requiredPlan) > planRank(plan);
  const status = connectors.find((c) => c.provider === provider.id)?.status ?? initialStatusFor(provider.id);
  const categories = categoriesOf(provider.id);

  return (
    <div className={`card lift flex flex-col ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <ProviderMark provider={provider.id} size={40} />
          <div>
            <h3 className="text-sm font-semibold leading-tight">{provider.name}</h3>
            <p className="mt-0.5 flex flex-wrap gap-1">
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="rounded-full bg-sage px-2 py-0.5 text-[10px] font-medium text-ink-2"
                >
                  {t(`connectors.cat.${cat}` as TranslationKey)}
                </span>
              ))}
            </p>
          </div>
        </div>
        {provider.requiredPlan !== "free" && (
          <span className="shrink-0 rounded-full border border-line bg-canvas px-2.5 py-1 text-[10px] font-semibold text-ink-2">
            {t("connectors.planRequired", { plan: t(PLANS[provider.requiredPlan].nameKey) })}
          </span>
        )}
      </div>

      {!compact && (
        <div className="mt-3">
          <p className="eyebrow">{t("connectors.provides")}</p>
          <p className="mt-1.5 flex flex-wrap gap-1">
            {provider.data.map((kind) => (
              <span
                key={kind}
                className="rounded-full border border-line bg-white px-2 py-0.5 text-[10px] font-medium text-ink-2"
              >
                {t(`connectors.data.${kind}` as TranslationKey)}
              </span>
            ))}
          </p>
        </div>
      )}

      <div className="mt-3 space-y-1">
        <ConnectorBadge status={status} />
        {provider.sampleData && (
          <p className="text-[11px] text-muted">
            {t("connectors.apiStatus", { status: t("connectors.status.waiting") })}
          </p>
        )}
        {selected && status !== "sample_data" && (
          <p className="text-[11px] font-medium text-brand">{t("connectors.selected")}</p>
        )}
      </div>

      <div className="mt-4 flex-1" />

      {selected ? (
        <button
          type="button"
          onClick={() => toggle(provider.id)}
          className="press w-full rounded-2xl border border-line bg-white py-2.5 text-sm font-semibold text-ink-2 transition hover:bg-canvas"
        >
          {t("connectors.remove")}
        </button>
      ) : locked ? (
        <UpgradeChip plan={provider.requiredPlan as "plus" | "pro"} />
      ) : provider.announcedOnly ? (
        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-2xl border border-line bg-canvas py-2.5 text-sm font-semibold text-muted opacity-70"
        >
          {t("connectors.status.comingSoon")}
        </button>
      ) : atLimit ? (
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1.5 text-xs font-semibold text-muted"
        >
          <LockIcon className="h-3.5 w-3.5" />
          {t("connectors.upgradeToConnectMore")}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => toggle(provider.id)}
          className="press w-full rounded-2xl bg-brand py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-deep"
        >
          {t("connectors.select")}
        </button>
      )}
    </div>
  );
}
