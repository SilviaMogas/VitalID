"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { ConnectorBadge, ProviderMark } from "@/components/connectors/ConnectorBadge";
import { PROVIDERS } from "@/lib/connectors";
import { providerName } from "@/lib/connectors-i18n";
import type { UserSetup } from "@/lib/onboarding/types";
import type { TranslationKey } from "@/lib/i18n";

/** Member-only dashboard blocks driven by the onboarding setup (manual baseline, goals, tools). */
export function MemberSetupPanel({ setup }: { setup: UserSetup }) {
  const { t, n } = useLocale();
  const b = setup.baseline;
  const all: { key: TranslationKey; value: number | null; unit: string }[] = [
    { key: "setup.steps", value: b.steps, unit: "" },
    { key: "setup.workouts", value: b.workoutsPerWeek, unit: t("setup.perWeek") },
    { key: "setup.hydration", value: b.hydrationGoalMl, unit: "ml" },
    { key: "setup.calories", value: b.calorieTarget, unit: "kcal" },
    { key: "setup.protein", value: b.proteinTargetG, unit: "g" },
  ];
  const tiles = all.filter((x) => x.value !== null);

  const providers = Array.from(new Map(setup.connectors.map((c) => [c.provider, c])).values());

  return (
    <div className="space-y-6">
      {tiles.length > 0 && (
        <section className="rise" style={{ ["--i" as string]: 3 }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-2">{t("setup.review.baseline")}</h2>
            <span className="text-xs text-muted">
              {t("source.label")}: {t("source.manual")}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {tiles.map((x) => (
              <div key={x.key} className="card p-4">
                <p className="text-xs text-muted">{t(x.key)}</p>
                <p className="mt-1 text-xl font-semibold tracking-tight" dir="ltr">
                  {n(x.value ?? 0)}
                  {x.unit && <span className="ms-1 text-xs font-medium text-muted">{x.unit}</span>}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">{t("dashboard.manualNotice")}</p>
        </section>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <section className="card rise p-4" style={{ ["--i" as string]: 4 }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-2">{t("dashboard.yourGoals")}</h2>
            <Link href="/onboarding?step=2" className="text-xs font-medium text-brand">
              {t("dashboard.manageTools")}
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {setup.goals.length === 0 && <span className="text-sm text-muted">—</span>}
            {setup.goals.map((g) => (
              <span key={g} className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-deep">
                {t(`setup.goal.${g}` as TranslationKey)}
              </span>
            ))}
          </div>
        </section>

        <section className="card rise p-4" style={{ ["--i" as string]: 5 }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-2">{t("dashboard.yourTools")}</h2>
            <Link href="/onboarding?step=5" className="text-xs font-medium text-brand">
              {t("dashboard.manageTools")}
            </Link>
          </div>
          {providers.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t("dashboard.noTools")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {providers.map((c) => (
                <li key={c.provider} className="flex items-center gap-2.5">
                  <ProviderMark provider={c.provider} size={28} />
                  <span className="flex-1 truncate text-sm font-medium">{providerName(PROVIDERS[c.provider], t)}</span>
                  <ConnectorBadge status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
