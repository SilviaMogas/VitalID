"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useWorkFocus } from "@/lib/work-focus-state";
import { overworkReason, workedMilliseconds } from "@/lib/work-focus";
import type { Identity } from "@/types";

export function WorkdayNudge({ identity }: { identity: Identity }) {
  const { t, locale } = useLocale();
  const { state, now } = useWorkFocus(identity.vitalId);
  const firstName = (identity.localizedName?.[locale] ?? identity.fullName).split(" ")[0];
  const reason = overworkReason(state, now);
  const minutes = Math.floor(workedMilliseconds(state, now) / 60_000);

  return (
    <section className="card rise flex flex-col gap-3 p-5" data-testid="workday-nudge">
      <div className="flex items-center gap-2">
        <span aria-hidden>⏱️</span>
        <h2 className="text-sm font-semibold text-ink-2">{t("focus.nudge.title")}</h2>
      </div>
      {reason ? (
        <p role="alert" data-testid="workday-warning" className="rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
          {t(reason === "limit" ? "focus.nudge.limit" : "focus.nudge.schedule", { name: firstName, minutes })}
        </p>
      ) : (
        <p className="text-sm text-muted" dir="ltr">
          {t("focus.nudge.hours", { start: state.workStart, end: state.workEnd })}
        </p>
      )}
      <Link href="/focus" className="press rounded-full border border-line bg-white px-4 py-2.5 text-center text-sm font-semibold text-brand">
        {t("focus.nudge.cta")}
      </Link>
    </section>
  );
}
