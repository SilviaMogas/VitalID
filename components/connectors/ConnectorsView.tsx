"use client";

import { useMemo, useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useMembership } from "@/components/providers/MembershipProvider";
import {
  CONNECTORS,
  CONNECTOR_CATEGORIES,
  connectorsInCategory,
  type ConnectorCategory,
} from "@/lib/connectors";
import { useConnectorSelection } from "@/lib/connectors-state";
import type { TranslationKey } from "@/lib/i18n";
import { PLANS } from "@/lib/plans";
import { ConnectorCard } from "@/components/connectors/ConnectorCard";
import { SectionTitle } from "@/components/vital-id/VitalIdSections";
import { MascotNote } from "@/components/mascot/MascotNote";

type Filter = "all" | "wearables" | "sleep" | "diet" | "fitness" | "healthRecords" | "habits";

const FILTERS: { id: Filter; key: TranslationKey; category: ConnectorCategory | null }[] = [
  { id: "all", key: "connectors.filter.all", category: null },
  { id: "wearables", key: "connectors.filter.wearables", category: "wearables" },
  { id: "sleep", key: "connectors.filter.sleep", category: "sleep" },
  { id: "diet", key: "connectors.filter.diet", category: "diet" },
  { id: "fitness", key: "connectors.filter.fitness", category: "fitness" },
  { id: "healthRecords", key: "connectors.filter.healthRecords", category: "medical" },
  { id: "habits", key: "connectors.filter.habits", category: "hydration" },
];

export function ConnectorsView() {
  const { t } = useLocale();
  const { plan } = useMembership();
  const { count, limit } = useConnectorSelection();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const activeCategory = FILTERS.find((f) => f.id === filter)?.category ?? null;
  const grouped = filter === "all" && query === "";

  const visible = useMemo(() => {
    let list = CONNECTORS;
    if (activeCategory) {
      list = list.filter((c) => c.categories.includes(activeCategory));
    }
    if (query) {
      list = list.filter((c) => {
        const haystack = [
          c.name,
          ...c.categories.map((cat) => t(`connectors.category.${cat}` as TranslationKey)),
          ...c.data.map((kind) => t(`connectors.data.${kind}` as TranslationKey)),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }
    return list;
  }, [activeCategory, query, t]);

  return (
    <div className="space-y-5">
      <section className="rise" style={{ ["--i" as string]: 0 }}>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("connectors.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("connectors.subtitle")}</p>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="rounded-full bg-brand-soft px-3 py-1 font-medium text-brand">
            {t("connectors.stats", {
              providers: CONNECTORS.length,
              categories: CONNECTOR_CATEGORIES.length,
            })}
          </span>
          <span className="rounded-full bg-sage px-3 py-1 font-medium text-ink-2">
            {limit === null
              ? t("connectors.usageUnlimited", { plan: t(PLANS[plan].nameKey) })
              : t("connectors.usage", { count, limit, plan: t(PLANS[plan].nameKey) })}
          </span>
        </p>
      </section>

      <div className="rise space-y-3" style={{ ["--i" as string]: 1 }}>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`press shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                filter === f.id
                  ? "bg-brand text-white shadow-sm"
                  : "border border-line bg-white text-ink-2 hover:bg-canvas"
              }`}
            >
              {t(f.key)}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("connectors.search")}
          className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand"
        />
      </div>

      {visible.length === 0 ? (
        <div className="rise surface p-5 text-center text-sm text-muted" style={{ ["--i" as string]: 2 }}>
          {t("connectors.noResults")}
        </div>
      ) : grouped ? (
        CONNECTOR_CATEGORIES.map((cat, i) => {
          const list = connectorsInCategory(cat);
          if (list.length === 0) return null;
          return (
            <div key={cat} className="rise" style={{ ["--i" as string]: 2 + i }}>
              <SectionTitle>{t(`connectors.category.${cat}` as TranslationKey)}</SectionTitle>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((c) => (
                  <ConnectorCard key={c.id} connector={c} />
                ))}
              </div>
            </div>
          );
        })
      ) : (
        <div className="rise grid gap-3 sm:grid-cols-2 lg:grid-cols-3" style={{ ["--i" as string]: 2 }}>
          {visible.map((c) => (
            <ConnectorCard key={c.id} connector={c} />
          ))}
        </div>
      )}

      <div className="rise mb-2 flex justify-center" style={{ ["--i" as string]: 10 }}>
        <MascotNote state="neutral" size={48}>
          {t("mascot.connectors")}
        </MascotNote>
      </div>
    </div>
  );
}
