"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import { PROVIDERS, type ConnectorStatus, type ProviderId } from "@/lib/connectors";
import type { TranslationKey } from "@/lib/i18n";

const STATUS_KEY: Record<ConnectorStatus, TranslationKey> = {
  connected: "connectors.status.connected",
  waiting_implementation: "connectors.status.waiting",
  coming_soon: "connectors.status.comingSoon",
  disconnected: "connectors.status.disconnected",
};

const STATUS_CLASS: Record<ConnectorStatus, string> = {
  connected: "bg-brand-soft text-brand-deep ring-brand/20",
  waiting_implementation: "bg-sand text-ink-2 ring-line",
  coming_soon: "bg-canvas text-muted ring-line",
  disconnected: "bg-white text-muted ring-line",
};

/** Honest connector status chip — `connected` is only ever rendered for real integrations. */
export function ConnectorBadge({ status, className = "" }: { status: ConnectorStatus; className?: string }) {
  const { t } = useLocale();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${STATUS_CLASS[status]} ${className}`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${status === "connected" ? "bg-brand" : "bg-muted/50"}`}
      />
      {t(STATUS_KEY[status])}
    </span>
  );
}

/** Brand mark badge (no third-party logo assets are bundled, so a tinted monogram is used). */
export function ProviderMark({ provider, size = 36 }: { provider: ProviderId; size?: number }) {
  const def = PROVIDERS[provider];
  return (
    <span
      aria-hidden
      dir="ltr"
      className="grid shrink-0 place-items-center rounded-xl font-bold text-white shadow-sm"
      style={{
        width: size,
        height: size,
        background: def.tint,
        fontSize: def.mark.length > 2 ? size * 0.28 : size * 0.42,
      }}
    >
      {def.mark}
    </span>
  );
}
