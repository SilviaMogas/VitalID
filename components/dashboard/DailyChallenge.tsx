"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import { useDailyChallenge } from "@/lib/challenge-state";
import { Broccoli } from "@/components/mascot/Broccoli";
import type { Identity } from "@/types";

export function DailyChallenge({ identity }: { identity: Identity }) {
  const { t, locale } = useLocale();
  const { challenge, completed, chooseAnother, complete } = useDailyChallenge();
  const firstName = (identity.localizedName?.[locale] ?? identity.fullName).split(" ")[0];

  return (
    <section className="card rise space-y-3 p-5" data-testid="daily-challenge">
      <div className="flex items-start gap-3">
        <span aria-hidden className="text-2xl">{challenge.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{t("challenge.eyebrow")}</p>
          <h2 className="mt-0.5 text-lg font-semibold tracking-tight">{t(challenge.titleKey)}</h2>
        </div>
        <Broccoli state={completed ? "success" : "encouraging"} size={44} className="shrink-0" />
      </div>
      <p className="text-sm text-ink-2">{t(challenge.bodyKey)}</p>
      {completed ? (
        <p role="status" data-testid="challenge-complete" className="rounded-2xl bg-brand-soft px-4 py-3 text-sm font-medium text-brand-deep">
          <span aria-hidden>🎉</span> {t("challenge.complete", { name: firstName })}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={complete} className="press rounded-full bg-brand py-2.5 text-sm font-semibold text-white shadow-hero">
            {t("challenge.done")}
          </button>
          <button type="button" onClick={chooseAnother} className="press rounded-full border border-line bg-white py-2.5 text-sm font-semibold text-ink-2">
            {t("challenge.another")}
          </button>
        </div>
      )}
      <p className="text-xs text-muted">{t("challenge.hint")}</p>
    </section>
  );
}
