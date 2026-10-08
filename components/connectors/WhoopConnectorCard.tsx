"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { ConnectorBadge, ProviderMark } from "@/components/connectors/ConnectorBadge";
import { HealthDataConsent } from "@/components/legal/HealthDataConsent";
import { HEALTH_CONSENT_STORAGE_KEY, PRIVACY_VERSION } from "@/lib/legal";
import type { ConnectorStatus } from "@/lib/connectors";
import type { WhoopConnectionPublic } from "@/lib/connectors/whoop/types";
import type { TranslationKey } from "@/lib/i18n";

const NOTICE_KEY: Record<string, TranslationKey> = {
  connected: "whoop.notice.connected",
  denied: "whoop.notice.denied",
  invalid_state: "whoop.notice.invalid_state",
  error: "whoop.notice.error",
  not_configured: "whoop.notConfigured",
  consent_required: "consent.connectorHint",
};

/** Reads + clears the ?whoop= notice flag written by the OAuth callback redirect. */
function WhoopNotice({ onKey }: { onKey: (key: TranslationKey | null, tone: "ok" | "warn") => void }) {
  const params = useSearchParams();
  const router = useRouter();
  const flag = params.get("whoop");

  useEffect(() => {
    if (!flag) return;
    const key = NOTICE_KEY[flag] ?? null;
    onKey(key, flag === "connected" ? "ok" : "warn");
    // Clear the param so a refresh doesn't re-show the notice.
    router.replace("/", { scroll: false });
  }, [flag, onKey, router]);
  return null;
}

/**
 * WHOOP connector card: shows connection state and drives connect / sync /
 * disconnect through the /api/connectors/whoop routes.
 */
export function WhoopConnectorCard({ status }: { status: WhoopConnectionPublic }) {
  const { t, d } = useLocale();
  const router = useRouter();
  const { status: authStatus } = useAuth();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ key: TranslationKey; tone: "ok" | "warn" } | null>(null);
  // null = still probing; the OAuth link stays behind the consent checkbox until
  // an explicit health-data consent is confirmed (server record or local flag).
  const [consentOk, setConsentOk] = useState<boolean | null>(null);
  const onNotice = useCallback((key: TranslationKey | null, tone: "ok" | "warn") => {
    if (key) setNotice({ key, tone });
  }, []);

  const badge: ConnectorStatus = status.connected
    ? "connected"
    : status.configured
      ? "disconnected"
      : "waiting_implementation";

  async function post(path: string): Promise<void> {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(path, { method: "POST" });
      if (res.status === 401) setNotice({ key: "whoop.notice.reauth", tone: "warn" });
      else if (res.status === 502) setNotice({ key: "whoop.notice.unavailable", tone: "warn" });
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  useEffect(() => {
    if (authStatus === "loading") return;
    let cancelled = false;
    const done = (v: boolean) => {
      if (!cancelled) setConsentOk(v);
    };
    // The browser flag only stands in for the demo session (no server account);
    // members are always checked against their own server-side consent record.
    if (authStatus !== "member") {
      try {
        done(window.localStorage.getItem(HEALTH_CONSENT_STORAGE_KEY) === "1");
      } catch {
        done(false);
      }
      return;
    }
    setConsentOk(null);
    fetch("/api/consent", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => done(Boolean(d?.consents?.health_data)))
      .catch(() => done(false));
    return () => {
      cancelled = true;
    };
  }, [authStatus]);

  const onConsentChange = (checked: boolean) => {
    setConsentOk(checked);
    if (!checked) return;
    if (authStatus !== "member") {
      try {
        window.localStorage.setItem(HEALTH_CONSENT_STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
      return;
    }
    setConsentOk(null);
    fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "health_data", policyVersion: PRIVACY_VERSION }),
    })
      .then((r) => setConsentOk(r.ok))
      .catch(() => setConsentOk(false));
  };

  const connectBlocked = !status.connected && status.configured && consentOk !== true;

  const onSync = () => void post("/api/connectors/whoop/sync");
  const onDisconnect = () => {
    if (window.confirm(t("whoop.confirmDisconnect"))) void post("/api/connectors/whoop/disconnect");
  };

  return (
    <section className="card rise p-4" style={{ ["--i" as string]: 3 }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <ProviderMark provider="whoop" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-ink">WHOOP</h2>
            <ConnectorBadge status={badge} />
          </div>
          {status.connected && (
            <p className="mt-0.5 text-xs text-muted">
              {status.lastSyncedAt
                ? `${t("whoop.lastSynced")}: ${d(status.lastSyncedAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`
                : t("whoop.neverSynced")}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {status.needsReauth && status.configured && !connectBlocked ? (
            <a
              href="/api/connectors/whoop/connect"
              className="press rounded-full bg-warn px-3.5 py-1.5 text-center text-xs font-semibold text-white"
            >
              {t("whoop.reconnect")}
            </a>
          ) : status.configured && !status.connected ? (
            connectBlocked ? (
              <button
                type="button"
                disabled
                title={t("consent.connectorHint")}
                className="cursor-not-allowed rounded-full bg-sand px-3.5 py-1.5 text-xs font-semibold text-muted"
              >
                {t("whoop.connect")}
              </button>
            ) : (
              <a
                href="/api/connectors/whoop/connect"
                className="press rounded-full bg-brand px-3.5 py-1.5 text-center text-xs font-semibold text-white"
              >
                {t("whoop.connect")}
              </a>
            )
          ) : !status.configured ? (
            <button
              type="button"
              disabled
              title={t("whoop.notConfigured")}
              className="cursor-not-allowed rounded-full bg-sand px-3.5 py-1.5 text-xs font-semibold text-muted"
            >
              {t("whoop.connect")}
            </button>
          ) : null}
          {status.connected && (
            <>
              <button
                type="button"
                onClick={onSync}
                disabled={busy}
                className="press rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-brand ring-1 ring-line disabled:opacity-60"
              >
                {busy ? t("whoop.syncing") : t("whoop.sync")}
              </button>
              <button
                type="button"
                onClick={onDisconnect}
                disabled={busy}
                className="press rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-muted ring-1 ring-line disabled:opacity-60"
              >
                {t("whoop.disconnect")}
              </button>
            </>
          )}
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <Suspense>
          <WhoopNotice onKey={onNotice} />
        </Suspense>
        {notice && (
          <p
            className={`rounded-xl px-3 py-2 text-sm ring-1 ${
              notice.tone === "ok"
                ? "bg-brand-soft text-brand-deep ring-brand/20"
                : "bg-warn-soft text-warn ring-warn/20"
            }`}
          >
            {t(notice.key)}
          </p>
        )}
        {status.needsReauth && (
          <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn ring-1 ring-warn/20">
            {t("whoop.notice.reauth")}
          </p>
        )}
        {!status.configured && <p className="text-xs text-muted">{t("whoop.notConfigured")}</p>}
        {status.connected && <p className="text-xs text-muted">{t("whoop.liveData")}</p>}
        {connectBlocked && (
          <HealthDataConsent id="whoop-consent" checked={Boolean(consentOk)} onChange={onConsentChange} />
        )}
      </div>
    </section>
  );
}
