"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import { SOLANA_WEARABLES, SOLANA_WEARABLES_REVIEWED_AT } from "@/lib/solana-wearables";

export function SolanaWearables() {
  const { t, d } = useLocale();

  return (
    <section aria-labelledby="solana-wearables-title" className="surface overflow-hidden">
      <div className="border-b border-line bg-sage/40 p-4 md:p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand">
          {t("solanaWearables.eyebrow")}
        </p>
        <h2 id="solana-wearables-title" className="mt-1 text-xl font-semibold tracking-tight">
          {t("solanaWearables.title")}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-2">
          {t("solanaWearables.disclosure")}
        </p>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-2 md:p-5 xl:grid-cols-3">
        {SOLANA_WEARABLES.map((wearable) => (
          <article
            key={wearable.id}
            className="flex min-w-0 flex-col rounded-2xl border border-line bg-white p-4"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-xs font-bold text-brand"
              >
                {wearable.mark}
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted">{t(wearable.categoryKey)}</p>
                <h3 className="mt-0.5 font-semibold"><bdi>{wearable.name}</bdi></h3>
              </div>
            </div>
            <p className="mt-3 self-start rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-ink-2">
              {t(wearable.availabilityKey)}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">{t(wearable.descriptionKey)}</p>
            <p className="mt-3 border-s-2 border-line ps-3 text-xs leading-relaxed text-muted">
              {t(wearable.integrationKey)}
            </p>
            <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2 pt-4 text-xs font-semibold text-brand">
              <a
                href={wearable.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
                aria-label={`${t("solanaWearables.website")} — ${wearable.name}`}
              >
                {t("solanaWearables.website")} <span aria-hidden="true">↗</span>
              </a>
              {wearable.sourceUrl !== wearable.url && (
                <a
                  href={wearable.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
                  aria-label={`${t("solanaWearables.source")} — ${wearable.name}`}
                >
                  {t("solanaWearables.source")} <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
      <p className="border-t border-line px-4 py-3 text-xs leading-relaxed text-muted md:px-5">
        {t("solanaWearables.reviewed", {
          date: d(SOLANA_WEARABLES_REVIEWED_AT, { year: "numeric", timeZone: "UTC" }),
        })}
      </p>
    </section>
  );
}
