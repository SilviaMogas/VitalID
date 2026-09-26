"use client";

import { useLang } from "@/app/providers";
import type { SignalSource } from "@/data/syntheticSignals";

export default function SyntheticBadge({ source = "synthetic", fetchedAt }: { source?: SignalSource; fetchedAt?: number }) {
  const { t, lang } = useLang();
  if (source === "whoop") {
    const time = fetchedAt
      ? new Date(fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";
    return (
      <span className="badge badge-live flex-col items-start" role="note" data-testid="live-badge" style={{ padding: "0.5rem 1rem" }}>
        <span>● {t("signals.live", { time })}</span>
      </span>
    );
  }
  if (source === "circular-sample") return (
    <span className="badge badge-warn flex-col items-start" role="note" data-testid="synthetic-badge" style={{ padding: "0.5rem 1rem" }}>
      <span>◌ {lang === "ar" ? "بيانات Circular نموذجية — اتصال تجريبي فقط" : "Circular sample data — demo connection only"}</span>
      <small>{lang === "ar" ? "ليست قراءة مباشرة من خاتم فاطمة." : "Not a live reading from Fátima’s ring."}</small>
    </span>
  );
  return (
    <span className="badge badge-warn flex-col items-start" role="note" data-testid="synthetic-badge" style={{ padding: "0.5rem 1rem" }}>
      <span>⚠️ {t("signals.badge")}</span>
      {lang === "ar" && (
        <span dir="ltr" lang="en" style={{ fontSize: "0.8rem" }}>
          Sample wearable data — not imported from WHOOP
        </span>
      )}
    </span>
  );
}
