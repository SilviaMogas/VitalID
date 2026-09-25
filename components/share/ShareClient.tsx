'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import {
  PURPOSE_PRESETS,
  SHARE_DURATIONS,
  SHARE_FIELDS,
  SHARE_PURPOSES,
  type ShareDuration,
  type ShareField,
  type SharePayload,
  type SharePurpose,
} from '@/lib/sharing';
import { t, dir, type Lang } from '@/lib/share-i18n';

interface ShareSummary {
  id: string;
  purpose: SharePurpose;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
  selectedFields: ShareField[];
}

function statusOf(s: ShareSummary): 'active' | 'expired' | 'revoked' {
  if (s.revoked) return 'revoked';
  return new Date(s.expiresAt).getTime() > Date.now() ? 'active' : 'expired';
}

export default function ShareClient({ lang }: { lang: Lang }) {
  const tr = useCallback((k: string) => t[lang][k] ?? k, [lang]);
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
      result && typeof window !== 'undefined'
        ? `${window.location.origin}/shared/${result.id}?lang=${lang}`
        : '',
    [result, lang],
  );

  const refreshShares = useCallback(async () => {
    try {
      const res = await fetch('/api/share', { cache: 'no-store' });
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
      setError(tr('selectAtLeastOne'));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: purpose ?? 'custom',
          selectedFields: Array.from(fields),
          durationMinutes: duration,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResult(await res.json());
      refreshShares();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    await fetch(`/api/share/${id}/revoke`, { method: 'POST' });
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
    if (!window.confirm(tr('resetConfirm'))) return;
    await fetch('/api/share/reset', { method: 'POST' });
    setResult(null);
    setShares([]);
    setFields(new Set());
    setPurpose(null);
    refreshShares();
  }

  const other: Lang = lang === 'en' ? 'ar' : 'en';
  const previewKeys: Record<ShareField, string> = {
    identity: 'previewIdentity',
    emergency: 'previewEmergency',
    signals: 'previewSignals',
    trends: 'previewTrends',
    profile: 'previewProfile',
  };
  const fieldKeys: Record<ShareField, string> = {
    identity: 'fieldIdentity',
    emergency: 'fieldEmergency',
    signals: 'fieldSignals',
    trends: 'fieldTrends',
    profile: 'fieldProfile',
  };
  const purposeKeys: Record<SharePurpose, string> = {
    emergency: 'purposeEmergency',
    doctor: 'purposeDoctor',
    travel: 'purposeTravel',
    caregiver: 'purposeCaregiver',
    custom: 'purposeCustom',
  };
  const durKeys: Record<ShareDuration, string> = { 15: 'dur15', 60: 'dur60', 1440: 'dur1440' };

  return (
    <div dir={dir(lang)} className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/?lang=${lang}`} className="text-sm text-gray-400 hover:text-gray-600">
          Vital ID
        </Link>
        <Link href={`/share?lang=${other}`} className="text-sm font-medium text-blue-600 hover:underline">
          {tr('langToggle')}
        </Link>
      </div>

      <h1 className="text-2xl font-bold">{tr('shareTitle')}</h1>
      <p className="mt-1 text-gray-500">{tr('shareSubtitle')}</p>

      {/* Step 1 — purpose */}
      <section className="mt-6">
        <h2 className="font-semibold">{tr('stepPurpose')}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {SHARE_PURPOSES.map((p) => (
            <button
              key={p}
              onClick={() => pickPurpose(p)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                purpose === p
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
              }`}
            >
              {tr(purposeKeys[p])}
            </button>
          ))}
        </div>
      </section>

      {/* Step 2 — fields */}
      <section className="mt-6">
        <h2 className="font-semibold">{tr('stepInfo')}</h2>
        <div className="mt-2 space-y-2">
          {SHARE_FIELDS.map((f) => (
            <label
              key={f}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:border-blue-300"
            >
              <input
                type="checkbox"
                checked={fields.has(f)}
                onChange={() => toggleField(f)}
                className="mt-1 h-4 w-4 accent-blue-600"
              />
              <span>
                <span className="block text-sm font-medium">{tr(fieldKeys[f])}</span>
                <span className="block text-xs text-gray-500">{tr(previewKeys[f])}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* Step 3 — expiry */}
      <section className="mt-6">
        <h2 className="font-semibold">{tr('stepExpiry')}</h2>
        <div className="mt-2 flex gap-2">
          {SHARE_DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                duration === d
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
              }`}
            >
              {tr(durKeys[d])}
            </button>
          ))}
        </div>
      </section>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        onClick={generate}
        disabled={busy}
        className="mt-6 w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {busy ? tr('generating') : tr('generate')}
      </button>

      {/* Result card */}
      {result && (
        <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          {result.revoked ? (
            <p className="text-center font-semibold text-red-600">{tr('revoked')}</p>
          ) : (
            <>
              <h3 className="font-semibold">{tr('yourLink')}</h3>
              <div className="mt-2 flex items-center gap-2">
                <input
                  readOnly
                  value={link}
                  className="w-full rounded border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={copyLink}
                  className="shrink-0 rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
                >
                  {copied ? tr('copied') : tr('copy')}
                </button>
              </div>
              <div className="mt-4 flex justify-center">
                <QRCodeSVG value={link} size={220} />
              </div>
              <p className="mt-2 text-center text-xs text-gray-500">{tr('qrNote')}</p>
              <p className="mt-3 text-sm text-gray-600">
                {tr('validUntil')}: {new Date(result.expiresAt).toLocaleString(lang === 'ar' ? 'ar' : 'en')}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-lg border border-blue-600 px-4 py-2 text-center text-sm font-medium text-blue-600 hover:bg-blue-50"
                >
                  {tr('openRecipient')}
                </a>
                <button
                  onClick={() => revoke(result.id)}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  {tr('revoke')}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* Active shares */}
      <section className="mt-8">
        <h2 className="font-semibold">{tr('activeShares')}</h2>
        <div className="mt-2 space-y-2">
          {shares.length === 0 && <p className="text-sm text-gray-400">{tr('noShares')}</p>}
          {shares.map((s) => {
            const st = statusOf(s);
            const badge =
              st === 'active'
                ? 'bg-green-100 text-green-700'
                : st === 'expired'
                  ? 'bg-gray-100 text-gray-500'
                  : 'bg-red-100 text-red-700';
            return (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2"
              >
                <div className="min-w-0">
                  <span className="mr-2 font-mono text-xs text-gray-500">{s.id}</span>
                  <span className="text-sm">{tr(purposeKeys[s.purpose])}</span>
                  <span className="mx-2 text-xs text-gray-400">
                    {tr('validUntil')} {new Date(s.expiresAt).toLocaleTimeString(lang === 'ar' ? 'ar' : 'en')}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}>
                    {tr(st === 'active' ? 'statusActive' : st === 'expired' ? 'statusExpired' : 'statusRevoked')}
                  </span>
                </div>
                {st === 'active' && (
                  <button
                    onClick={() => revoke(s.id)}
                    className="ms-2 shrink-0 rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    {tr('revoke')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <footer className="mt-10 border-t border-gray-200 pt-4">
        <button
          onClick={resetDemo}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          {tr('resetDemo')}
        </button>
      </footer>
    </div>
  );
}
