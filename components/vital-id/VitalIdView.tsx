"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import type { VitalIdSnapshot } from "@/types";

export function VitalIdView({ snapshot }: { snapshot: VitalIdSnapshot }) {
  const { t } = useLocale();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("vitalId.title")}</h1>
      <p className="text-sm text-muted">{t("vitalId.subtitle")}</p>
      <div className="card p-5">
        <p className="font-semibold">{snapshot.identity.fullName}</p>
        <p className="text-sm text-muted">{snapshot.identity.vitalId}</p>
      </div>
    </div>
  );
}
