"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { BillingInterval } from "@/lib/plans";

interface SolPaymentRequest {
  reference: string;
  url: string;
  lamports: string;
  sol: string;
  cluster: string;
  treasury: string;
  expiresAt: string;
}

type Phase = "idle" | "creating" | "awaiting" | "paid" | "expired";

const POLL_MS = 4_000;
const MAX_POLLS = 225; // ~15 minutes

export function SolPayButton({
  plan,
  interval,
  disabled,
  onPaid,
}: {
  plan: "plus" | "pro";
  interval: BillingInterval;
  disabled?: boolean;
  onPaid: () => void;
}) {
  const { t } = useLocale();
  const [phase, setPhase] = useState<Phase>("idle");
  const [request, setRequest] = useState<SolPaymentRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const polls = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;

  const stopPolling = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const poll = useCallback(
    (reference: string) => {
      stopPolling();
      if (polls.current >= MAX_POLLS) {
        setPhase("expired");
        return;
      }
      polls.current += 1;
      timer.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/sol/status?reference=${encodeURIComponent(reference)}`, {
            cache: "no-store",
          });
          const data = (await res.json().catch(() => ({}))) as { state?: string };
          if (res.ok && data.state === "paid") {
            setPhase("paid");
            onPaidRef.current();
            return;
          }
          if (res.ok && (data.state === "expired" || data.state === "missing")) {
            setPhase("expired");
            return;
          }
        } catch {
          // Network hiccup — keep polling.
        }
        poll(reference);
      }, POLL_MS);
    },
    [stopPolling],
  );

  async function start() {
    setError(null);
    setCopied(false);
    polls.current = 0;
    setPhase("creating");
    try {
      const res = await fetch("/api/sol/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      });
      const data = (await res.json().catch(() => ({}))) as SolPaymentRequest & { error?: string };
      if (res.status === 503 || data.error === "solpay_not_configured") {
        setError(t("pricing.solpayNotConfigured"));
        setPhase("idle");
        return;
      }
      if (!res.ok || !data.reference || !data.url) {
        setError(t("common.error"));
        setPhase("idle");
        return;
      }
      setRequest(data);
      setPhase("awaiting");
      poll(data.reference);
    } catch {
      setError(t("common.error"));
      setPhase("idle");
    }
  }

  function close() {
    stopPolling();
    setPhase("idle");
    setRequest(null);
    setError(null);
  }

  async function copyUrl() {
    if (!request) return;
    try {
      await navigator.clipboard.writeText(request.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the link below is still selectable.
    }
  }

  if (phase === "idle") {
    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={start}
          disabled={disabled}
          className="w-full rounded-2xl border border-line bg-white py-3 text-sm font-semibold text-ink-2 transition hover:bg-canvas disabled:opacity-50"
        >
          {t("pricing.payWithSol")}
        </button>
        {error && <p className="mt-2 text-center text-xs text-bad">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-2xl border border-line bg-canvas p-4 text-center">
      {phase === "creating" && <p className="text-sm text-muted">{t("common.loading")}</p>}
      {phase === "awaiting" && request && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">
            {t("solpay.title", { amount: request.sol })}
          </p>
          {request.cluster !== "mainnet-beta" && (
            <p className="rounded-lg bg-mint/50 px-2 py-1 text-xs text-brand-deep">{t("solpay.devnet")}</p>
          )}
          <div className="inline-block rounded-xl bg-white p-3">
            <QRCodeSVG value={request.url} size={170} />
          </div>
          <p className="text-xs text-muted">{t("solpay.scan")}</p>
          <div className="flex justify-center gap-2">
            <a
              href={request.url}
              className="rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-ink"
            >
              {t("solpay.openWallet")}
            </a>
            <button
              type="button"
              onClick={copyUrl}
              className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-2 transition hover:bg-canvas"
            >
              {copied ? t("share.copied") : t("share.copy")}
            </button>
          </div>
          <p className="text-xs text-muted">{t("solpay.waiting")}</p>
          <p className="text-[11px] text-muted">{t("solpay.smallPrint")}</p>
          <button type="button" onClick={close} className="text-xs font-medium text-muted underline">
            {t("solpay.close")}
          </button>
        </div>
      )}
      {phase === "paid" && <p className="text-sm font-semibold text-brand">{t("solpay.paid")}</p>}
      {phase === "expired" && (
        <div className="space-y-2">
          <p className="text-sm text-muted">{t("solpay.expired")}</p>
          <button
            type="button"
            onClick={start}
            className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-2 transition hover:bg-canvas"
          >
            {t("solpay.retry")}
          </button>
        </div>
      )}
    </div>
  );
}
