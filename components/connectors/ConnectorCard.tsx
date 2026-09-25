"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useMembership } from "@/components/providers/MembershipProvider";
import { useConnectorSelection } from "@/lib/connectors-state";
import type { ConnectorDefinition, ConnectorStatus } from "@/lib/connectors";
import type { TranslationKey } from "@/lib/i18n";
import { PLANS, planRank } from "@/lib/plans";
import { UpgradeChip, LockIcon } from "@/components/membership/UpgradeChip";

const STATUS_KEYS: Record<ConnectorStatus, TranslationKey> = {
  connected: "connectors.status.connected",
  sample: "connectors.status.sample",
  waiting: "connectors.status.waiting",
  "coming-soon": "connectors.status.comingSoon",
  disconnected: "connectors.status.disconnected",
};

const STATUS_STYLES: Record<ConnectorStatus, string> = {
  connected: "bg-mint text-brand-deep",
  sample: "bg-brand-soft text-brand-deep",
  waiting: "bg-sand text-ink-2",
  "coming-soon": "bg-canvas text-muted",
  disconnected: "bg-line text-muted",
};

export function ConnectorCard({
  connector,
  compact = false,
}: {
  connector: ConnectorDefinition;
  compact?: boolean;
}) {
  const { t } = useLocale();
  const { plan } = useMembership();
  const { isSelected, toggle, atLimit } = useConnectorSelection();

  const selected = isSelected(connector.id);
  const locked = planRank(connector.requiredPlan) > planRank(plan);
  const statusKey = STATUS_KEYS[connector.status];

  return (
    <div className={`card lift flex flex-col ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold"
            style={{ backgroundColor: connector.logo.color, color: connector.logo.textColor ?? "#fff" }}
          >
            {connector.logo.monogram}
          </span>
          <div>
            <h3 className="text-sm font-semibold leading-tight">{connector.name}</h3>
            <p className="mt-0.5 flex flex-wrap gap-1">
              {connector.categories.map((cat) => (
                <span
                  key={cat}
                  className="rounded-full bg-sage px-2 py-0.5 text-[10px] font-medium text-ink-2"
                >
                  {t(`connectors.category.${cat}` as TranslationKey)}
                </span>
              ))}
            </p>
          </div>
        </div>
        {connector.requiredPlan !== "free" && (
          <span className="shrink-0 rounded-full border border-line bg-canvas px-2.5 py-1 text-[10px] font-semibold text-ink-2">
            {t("connectors.planRequired", { plan: t(PLANS[connector.requiredPlan].nameKey) })}
          </span>
        )}
      </div>

      {!compact && (
        <div className="mt-3">
          <p className="eyebrow">{t("connectors.provides")}</p>
          <p className="mt-1.5 flex flex-wrap gap-1">
            {connector.data.map((kind) => (
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
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[connector.status]}`}
        >
          {t(statusKey)}
        </span>
        {connector.id === "circular-ring" && (
          <p className="text-[11px] text-muted">
            {t("connectors.apiStatus", { status: t("connectors.status.waiting") })}
          </p>
        )}
        {selected && connector.status !== "sample" && (
          <p className="text-[11px] font-medium text-brand">{t("connectors.selected")}</p>
        )}
      </div>

      <div className="mt-4 flex-1" />

      {locked ? (
        <UpgradeChip plan={connector.requiredPlan as "plus" | "pro"} />
      ) : selected ? (
        <button
          type="button"
          onClick={() => toggle(connector.id)}
          className="press w-full rounded-2xl border border-line bg-white py-2.5 text-sm font-semibold text-ink-2 transition hover:bg-canvas"
        >
          {t("connectors.remove")}
        </button>
      ) : atLimit ? (
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1.5 text-xs font-semibold text-muted border border-line"
        >
          <LockIcon className="h-3.5 w-3.5" />
          {t("connectors.upgradeToConnectMore")}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => toggle(connector.id)}
          className="press w-full rounded-2xl bg-brand py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-deep"
        >
          {t("connectors.select")}
        </button>
      )}
    </div>
  );
}
