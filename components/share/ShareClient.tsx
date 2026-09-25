"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n";
import { SectionTitle } from "@/components/vital-id/VitalIdSections";
import {
  PURPOSE_PRESETS,
  SHARE_DURATIONS,
  SHARE_FIELDS,
  SHARE_PURPOSES,
  type ShareDuration,
  type ShareField,
  type SharePayload,
  type SharePurpose,
} from "@/lib/sharing";

interface ShareSummary {
  id: string;
  purpose: SharePurpose;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
  selectedFields: ShareField[];
}

function statusOf(s: ShareSummary): "active" | "expired" | "revoked" {
  if (s.revoked) return "revoked";
  return new Date(s.expiresAt).getTime() > Date.now() ? "active" : "expired";
}

const STATUS_BADGE: Record<ReturnType<typeof statusOf>, string> = {
  active: "bg-good-soft text-good",
  expired: "bg-canvas text-muted",
  revoked: "bg-bad-soft text-bad",
};

export default function ShareClient() {
  const { t, d } = useLocale();
  const [purpose, setPurpose] = useState<SharePurpose | null>(null);
  const [fields, setFields] = useState<Set<ShareField>>(new Set());
  const [duration, setDuration] = useState<ShareDuration>(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SharePayload | null>(null);
  const [copied, setCopied] = useState(false);
  const [shares, setShares] = useState<ShareSummary[]>([]);

  const link = useMemo(
    () =>
      result && typeof window !== "undefined"
        ? `${window.location.origin}/shared/${result.id}`
        : "",
    [result],
  );

  const refreshShares = useCallback(async () => {
    try {
      const res = await fetch("/api/share", { cache: "no-store" });
      if (res.ok) setShares(await res.json());
    } catch {
      /* keep current list */
    }
  }, []);

  useEffect(() => {
    const t0 = setTimeout(refreshShares, 0);
    return () => clearTimeout(t0);
  }, [refreshShares]);

  function pickPurpose(p: SharePurpose) {
    setPurpose(p);
    setFields(new Set(PURPOSE_PRESETS[p]));
  }

  function toggleField(f: ShareField) {
    setFields((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  }

  async function generate() {
    if (fields.size === 0) {
      setError(t("share.selectAtLeastOne"));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: purpose ?? "custom",
          selectedFields: Array.from(fields),
          durationMinutes: duration,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResult(await res.json());
      refreshShares();
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    await fetch(`/api/share/${id}/revoke`, { method: "POST" });
    if (result?.id === id) setResult({ ...result, revoked: true });
    refreshShares();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function resetDemo() {
    if (!window.confirm(t("share.resetConfirm"))) return;
    await fetch("/api/share/reset", { method: "POST" });
    setResult(null);
    setShares([]);
    setFields(new Set());
    setPurpose(null);
    refreshShares();
  }

  const pill = (on: boolean) =>
    `rounded-full border px-4 py-1.5 text-sm font-medium transition ${
      on
        ? "border-brand bg-brand text-white"
        : "border-line bg-white text-ink-2 hover:border-brand"
    }`;

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("share.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("share.subtitle")}</p>
      </section>

      {/* Step 1 — purpose */}
      <div className="card p-5">
        <SectionTitle>{t("share.stepPurpose")}</SectionTitle>
        <div className="mt-3 flex flex-wrap gap-2">
          {SHARE_PURPOSES.map((p) => (
            <button key={p} type="button" onClick={() => pickPurpose(p)} className={pill(purpose === p)}>
              {t(`share.purpose.${p}` as TranslationKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2 — fields */}
      <div className="card p-5">
        <SectionTitle>{t("share.stepInfo")}</SectionTitle>
        <div className="mt-3 space-y-2">
          {SHARE_FIELDS.map((f) => (
            <label
              key={f}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-canvas/50 p-3 transition hover:border-brand"
            >
              <input
                type="checkbox"
                checked={fields.has(f)}
                onChange={() => toggleField(f)}
                className="mt-1 h-4 w-4 accent-brand"
              />
              <span>
                <span className="block text-sm font-medium">{t(`share.field.${f}` as TranslationKey)}</span>
                <span className="block text-xs text-muted">{t(`share.preview.${f}` as TranslationKey)}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Step 3 — expiry */}
      <div className="card p-5">
        <SectionTitle>{t("share.stepExpiry")}</SectionTitle>
        <div className="mt-3 flex flex-wrap gap-2">
          {SHARE_DURATIONS.map((dur) => (
            <button key={dur} type="button" onClick={() => setDuration(dur)} className={pill(duration === dur)}>
              {t(`share.duration.${dur}` as TranslationKey)}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-bad">{error}</p>}

      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="w-full rounded-2xl bg-brand py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-ink disabled:opacity-50"
      >
        {busy ? t("share.generating") : t("share.generate")}
      </button>

      {/* Result card */}
      {result && (
        <div className="card p-5">
          {result.revoked ? (
            <p className="text-center font-semibold text-bad">{t("share.revoked")}</p>
          ) : (
            <>
              <SectionTitle>{t("share.yourLink")}</SectionTitle>
              <div className="mt-3 flex items-center gap-2">
                <input
                  readOnly
                  value={link}
                  dir="ltr"
                  className="w-full rounded-lg border border-line bg-canvas px-2 py-1.5 font-mono text-xs"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-sm transition hover:bg-canvas"
                >
                  {copied ? t("share.copied") : t("share.copy")}
                </button>
              </div>
              <div className="mt-4 flex justify-center">
                <QRCodeSVG value={link} size={220} />
              </div>
              <p className="mt-2 text-center text-xs text-muted">{t("share.qrNote")}</p>
              <p className="mt-3 text-sm text-ink-2">
                {t("share.validUntil")}:{" "}
                {d(result.expiresAt, { year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-xl border border-brand px-4 py-2.5 text-center text-sm font-medium text-brand transition hover:bg-brand-soft"
                >
                  {t("share.openRecipient")}
                </a>
                <button
                  type="button"
                  onClick={() => revoke(result.id)}
                  className="flex-1 rounded-xl bg-bad px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                >
                  {t("share.revoke")}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Active shares */}
      <div className="card p-5">
        <SectionTitle>{t("share.activeShares")}</SectionTitle>
        <div className="mt-3 divide-y divide-line">
          {shares.length === 0 && <p className="py-1 text-sm text-muted">{t("share.noShares")}</p>}
          {shares.map((s) => {
            const st = statusOf(s);
            return (
              <div key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {t(`share.purpose.${s.purpose}` as TranslationKey)}
                    <span className="ms-2 font-mono text-xs text-muted" dir="ltr">
                      {s.id}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {t("share.validUntil")}{" "}
                    {d(s.expiresAt, { year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGE[st]}`}>
                    {t(`share.status.${st}` as TranslationKey)}
                  </span>
                  {st === "active" && (
                    <button
                      type="button"
                      onClick={() => revoke(s.id)}
                      className="rounded-lg border border-bad/30 px-2.5 py-1 text-xs text-bad transition hover:bg-bad-soft"
                    >
                      {t("share.revoke")}
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pb-2">
        <button
          type="button"
          onClick={resetDemo}
          className="rounded-xl border border-line px-3.5 py-2 text-sm text-muted transition hover:bg-canvas"
        >
          {t("share.reset")}
        </button>
      </div>
    </div>
  );
}
