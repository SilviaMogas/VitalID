'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { isShareActive, type SharePayload } from '@/lib/sharing';
import { t, dir, type Lang } from '@/lib/share-i18n';

type State = 'loading' | 'unavailable' | 'active';

const purposeKeys: Record<string, string> = {
  emergency: 'purposeEmergency',
  doctor: 'purposeDoctor',
  travel: 'purposeTravel',
  caregiver: 'purposeCaregiver',
  custom: 'purposeCustom',
};

export default function SharedViewClient({ id, lang }: { id: string; lang: Lang }) {
  const tr = useCallback((k: string) => t[lang][k] ?? k, [lang]);
  const [state, setState] = useState<State>('loading');
  const [payload, setPayload] = useState<SharePayload | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/share/${id}`, { cache: 'no-store' });
      if (res.status === 410) {
        setState('unavailable');
        setPayload(null);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const p = (await res.json()) as SharePayload;
      if (!isShareActive(p)) {
        setState('unavailable');
        setPayload(null);
        return;
      }
      setPayload(p);
      setState('active');
    } catch {
      /* transient error — keep current state */
    }
  }, [id]);

  useEffect(() => {
    const t0 = setTimeout(poll, 0);
    const iv = setInterval(() => {
      // Reflect client-side expiry without waiting for the next fetch.
      setPayload((p) => {
        if (p && !isShareActive(p)) {
          setState('unavailable');
          return null;
        }
        return p;
      });
      poll();
    }, 10_000);
    return () => {
      clearTimeout(t0);
      clearInterval(iv);
    };
  }, [poll]);

  const other: Lang = lang === 'en' ? 'ar' : 'en';

  if (state === 'loading') {
    return (
      <div dir={dir(lang)} className="flex min-h-screen items-center justify-center">
        <p className="text-gray-400">{tr('loading')}</p>
      </div>
    );
  }

  if (state === 'unavailable' || !payload) {
    return (
      <div dir={dir(lang)} className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-800">{tr('unavailable')}</p>
        </div>
      </div>
    );
  }

  const s = payload.snapshot;
  const locale = lang === 'ar' ? 'ar' : 'en';

  return (
    <div dir={dir(lang)} className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-end">
        <Link href={`/shared/${id}?lang=${other}`} className="text-sm font-medium text-blue-600 hover:underline">
          {tr('langToggle')}
        </Link>
      </div>

      <header className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold">{tr('recipientTitle')}</h1>
        <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-gray-400">{tr('sharedBy')}</dt>
            <dd className="font-medium">{payload.sharedBy}</dd>
          </div>
          <div>
            <dt className="text-gray-400">{tr('purpose')}</dt>
            <dd className="font-medium">{tr(purposeKeys[payload.purpose] ?? payload.purpose)}</dd>
          </div>
          <div>
            <dt className="text-gray-400">{tr('validUntil')}</dt>
            <dd className="font-medium">{new Date(payload.expiresAt).toLocaleString(locale)}</dd>
          </div>
        </dl>
      </header>

      {s.identity && (
        <Section title={tr('sectionIdentity')}>
          <Row k={tr('name')} v={s.identity.name} />
          <Row k={tr('dob')} v={s.identity.dateOfBirth} />
          <Row k={tr('bloodType')} v={s.identity.bloodType} />
          <Row k={tr('vitalId')} v={s.identity.vitalId} />
        </Section>
      )}

      {s.emergency && (
        <Section title={tr('sectionEmergency')}>
          <Row
            k={tr('emergencyContact')}
            v={`${s.emergency.emergencyContact.name} (${s.emergency.emergencyContact.relation}) — ${s.emergency.emergencyContact.phone}`}
          />
          <Row k={tr('allergies')} v={s.emergency.allergies.join(', ') || '—'} />
          <Row k={tr('conditions')} v={s.emergency.conditions.join(', ') || '—'} />
          <Row k={tr('medications')} v={s.emergency.medications.join(', ') || '—'} />
        </Section>
      )}

      {s.signals && (
        <Section title={tr('sectionSignals')}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-start text-xs text-gray-400">
                  <th className="pb-1 text-start font-medium">{tr('metric')}</th>
                  <th className="pb-1 text-start font-medium">{tr('value')}</th>
                  <th className="pb-1 text-start font-medium">{tr('status')}</th>
                  <th className="pb-1 text-start font-medium">{tr('timestamp')}</th>
                </tr>
              </thead>
              <tbody>
                {s.signals.map((m) => (
                  <tr key={m.metric} className="border-t border-gray-100">
                    <td className="py-2">{m.metric}</td>
                    <td className="py-2 font-medium">
                      {m.value} {m.unit}
                    </td>
                    <td className="py-2">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="py-2 text-gray-500">{new Date(m.timestamp).toLocaleString(locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {tr('source')}: {s.signals[0]?.source}
          </p>
        </Section>
      )}

      {s.trends && (
        <Section title={tr('sectionTrends')}>
          <ul className="space-y-2">
            {s.trends.map((tr_, i) => (
              <li key={i} className="rounded-lg bg-gray-50 p-3 text-sm">
                <div className="font-medium">
                  {tr_.metric} — {tr_.period} — {tr_.direction}
                </div>
                <p className="mt-1 text-gray-600">{tr_.summary}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {tr('source')}: {tr_.source}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {s.profile && (
        <Section title={tr('sectionProfile')}>
          <Row k={tr('height')} v={s.profile.height} />
          <Row k={tr('weight')} v={s.profile.weight} />
          <Row k={tr('lifestyle')} v={s.profile.lifestyle.join(', ')} />
          <Row k={tr('notes')} v={s.profile.notes} />
        </Section>
      )}

      <footer className="mt-8 text-center text-xs text-gray-400">{tr('readonlyFooter')}</footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-50 py-1.5 text-sm last:border-0">
      <span className="text-gray-400">{k}</span>
      <span className="text-end font-medium">{v}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: 'normal' | 'watch' | 'attention' }) {
  const cls =
    status === 'normal'
      ? 'bg-green-100 text-green-700'
      : status === 'watch'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-700';
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
}
