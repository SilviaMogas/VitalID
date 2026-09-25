"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useMembership } from "@/components/providers/MembershipProvider";
import { LockedFeature } from "@/components/membership/LockedFeature";
import { LockIcon, UpgradeChip } from "@/components/membership/UpgradeChip";
import type { TranslationKey } from "@/lib/i18n";
import { SectionTitle } from "@/components/vital-id/VitalIdSections";
import { MascotNote } from "@/components/mascot/MascotNote";
import { Companion } from "@/components/companions/Companion";
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
  const { hasFeature } = useMembership();
  const canPickExpiry = hasFeature("configurableExpiry");
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
    `press rounded-2xl px-4 py-1.5 text-sm font-medium transition ${
      on
        ? "bg-brand text-white shadow-card"
        : "bg-white text-ink-2 ring-1 ring-line hover:bg-sage"
    }`;

  return (
    <div className="space-y-5">
      <section className="flex items-center gap-3">
        <Companion name="shield" mood="idle" size={56} label={t("companion.shield")} className="shrink-0" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("share.title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("share.subtitle")}</p>
        </div>
      </section>

      <div className="rise" style={{ ["--i" as string]: 0 }}>
        <MascotNote state="encouraging" size={56}>
          {t("mascot.shareIntro")}
        </MascotNote>
      </div>

      {/* Step 1 — purpose */}
      <div className="card rise p-5" style={{ ["--i" as string]: 1 }}>
        <div className="flex items-baseline gap-2">
          <SectionTitle>{t("share.stepPurpose")}</SectionTitle>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {SHARE_PURPOSES.map((p) => (
            <button key={p} type="button" onClick={() => pickPurpose(p)} className={pill(purpose === p)}>
              {t(`share.purpose.${p}` as TranslationKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2 — fields */}
      <div className="card rise p-5" style={{ ["--i" as string]: 2 }}>
        <div className="flex items-baseline gap-2">
          <SectionTitle>{t("share.stepInfo")}</SectionTitle>
        </div>
        <div className="mt-3 space-y-2">
          {SHARE_FIELDS.map((f) => (
            <label
              key={f}
              className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line transition hover:ring-brand"
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
      <div className="card rise p-5" style={{ ["--i" as string]: 3 }}>
        <div className="flex items-baseline gap-2">
          <SectionTitle>{t("share.stepExpiry")}</SectionTitle>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {SHARE_DURATIONS.map((dur) => {
            const locked = !canPickExpiry && dur !== 60;
            return (
              <button
                key={dur}
                type="button"
                disabled={locked}
                onClick={() => setDuration(locked ? 60 : dur)}
                className={`${pill(duration === dur)} ${locked ? "inline-flex items-center gap-1 opacity-60" : ""}`}
              >
                {t(`share.duration.${dur}` as TranslationKey)}
                {locked && <LockIcon className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
        {!canPickExpiry && (
          <div className="mt-3">
            <UpgradeChip plan="plus" />
          </div>
        )}
      </div>

      {error && <p className="text-sm text-bad">{error}</p>}

      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="press w-full rounded-2xl bg-brand py-3.5 text-sm font-semibold text-white shadow-lift transition hover:bg-brand-deep disabled:opacity-50"
      >
        {busy ? t("share.generating") : t("share.generate")}
      </button>

      {/* Result card */}
      {result && (
        <div className="card pop p-5">
          {result.revoked ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <MascotNote state="neutral" size={56}>
                {t("mascot.shareRevoked")}
              </MascotNote>
              <p className="text-center font-semibold text-bad">{t("share.revoked")}</p>
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <MascotNote state="success" size={56}>
                  {t("mascot.shareReady")}
                </MascotNote>
              </div>
              <div className="mt-3">
                <SectionTitle>{t("share.yourLink")}</SectionTitle>
              </div>
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
                <LockedFeature
                  variant="overlay"
                  feature="qrSharing"
                  title={t("membership.gate.qrTitle")}
                  description={t("membership.gate.qrDesc")}
                >
                  <div className="rounded-2xl bg-white p-4 shadow-lift ring-1 ring-line">
                    <QRCodeSVG value={link} size={200} />
                  </div>
                </LockedFeature>
              </div>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
                <span aria-hidden>🔒</span>
                {t("share.qrNote")}
              </p>
              <p className="mt-3 flex justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3.5 py-1.5 text-sm font-semibold text-brand-deep">
                  {t("share.validUntil")}:{" "}
                  {d(result.expiresAt, { year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press flex-1 rounded-xl bg-white px-4 py-2.5 text-center text-sm font-medium text-brand ring-1 ring-brand transition hover:bg-brand-soft"
                >
                  {t("share.openRecipient")}
                </a>
                <button
                  type="button"
                  onClick={() => revoke(result.id)}
                  className="press flex-1 rounded-xl bg-bad px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                >
                  {t("share.revoke")}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Active shares */}
      <div className="surface p-5">
        <SectionTitle>{t("share.activeShares")}</SectionTitle>
        <div className="mt-3 space-y-2">
          {shares.length === 0 && <p className="py-1 text-sm text-muted">{t("share.noShares")}</p>}
          {shares.map((s) => {
            const st = statusOf(s);
            return (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-line"
              >
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
                      className="press rounded-full bg-white px-3 py-1 text-xs font-medium text-bad ring-1 ring-bad/40 transition hover:bg-bad-soft"
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
          className="press rounded-full bg-white px-3.5 py-2 text-sm text-muted ring-1 ring-line transition hover:bg-sage"
        >
          {t("share.reset")}
        </button>
      </div>
    </div>
  );
}
