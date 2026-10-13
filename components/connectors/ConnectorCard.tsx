"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useMembership } from "@/components/providers/MembershipProvider";
import { useConnectorSelection } from "@/lib/connectors-state";
import {
  canSelectProvider,
  categoriesOf,
  initialStatusFor,
  type ProviderDef,
} from "@/lib/connectors";
import type { TranslationKey } from "@/lib/i18n";
import { PLANS, planRank } from "@/lib/plans";
import { ConnectorBadge, ProviderMark } from "@/components/connectors/ConnectorBadge";
import { providerName } from "@/lib/connectors-i18n";

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
  const status =
    connectors.find((c) => c.provider === provider.id)?.status ??
    (canSelectProvider(provider) ? initialStatusFor(provider.id) : "coming_soon");
  const categories = categoriesOf(provider.id);

  return (
    <div className={`card lift flex flex-col ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <ProviderMark provider={provider.id} size={40} />
          <div>
            <h3 className="text-sm font-semibold leading-tight">{providerName(provider, t)}</h3>
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
        {provider.requiredPlan !== "free" && provider.integration !== "none" && (
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
        {provider.integration === "none" && canSelectProvider(provider) && (
          <p className="text-[11px] text-muted">
            {t(provider.sampleData ? "connectors.sampleOnly" : "connectors.preferenceOnly")}
          </p>
        )}
        {selected && status !== "sample_data" && (
          <p className="text-[11px] font-medium text-brand">{t("connectors.selected")}</p>
        )}
      </div>

      {provider.sampleData && (
        <Link href={`/demo/connectors/${provider.id}`} className="mt-3 text-sm font-medium text-brand">
          {t("connectors.exploreDemo")}
        </Link>
      )}

      {provider.integration === "none" && (
        <details className="mt-3 rounded-xl border border-line p-3 text-xs text-ink-2">
          <summary className="cursor-pointer font-semibold text-brand">{t("connectors.integrationDetails")}</summary>
          <p className="mt-2 leading-relaxed">{t("connectors.integrationPending")}</p>
          {provider.website && (
            <a href={provider.website} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-semibold text-brand underline">
              {t("connectors.providerWebsite")}
            </a>
          )}
        </details>
      )}

      <div className="mt-4 flex-1" />

      {provider.integration === "oauth" ? (
        <a
          href="#whoop-connection"
          className="press w-full rounded-2xl bg-brand py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-brand-deep"
        >
          {t("connectors.manageConnection")}
        </a>
      ) : selected ? (
        <button
          type="button"
          onClick={() => toggle(provider.id)}
          className="press w-full rounded-2xl border border-line bg-white py-2.5 text-sm font-semibold text-ink-2 transition hover:bg-canvas"
        >
          {t("connectors.remove")}
        </button>
      ) : !canSelectProvider(provider) ? (
        <p className="text-xs text-muted">
          {t("connectors.status.comingSoon")}
        </p>
      ) : locked ? (
        <p className="text-xs text-muted">{t("connectors.integrationPending")}</p>
      ) : atLimit ? (
        <p className="text-xs text-muted">{t("connectors.preferenceLimit")}</p>
      ) : (
        <button
          type="button"
          onClick={() => toggle(provider.id)}
          className="press w-full rounded-2xl bg-brand py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-deep"
        >
          {t("connectors.notifyMe")}
        </button>
      )}
    </div>
  );
}
