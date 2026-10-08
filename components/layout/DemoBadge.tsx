"use client";

import { useLocale } from "@/components/providers/LocaleProvider";

/** Visible DEMO marker shown whenever the Fatima demo session is active — the
 *  localStorage shortcut is never mistaken for a real member session. */
export function DemoBadge() {
  const { t } = useLocale();
  return (
    <span
      title={t("app.demoBadge")}
      className="rounded-full bg-warn-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-warn ring-1 ring-warn/30"
    >
      {t("demo.sessionBadge")}
    </span>
  );
}
