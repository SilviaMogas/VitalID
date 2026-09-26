"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RequireConsent from "@/components/RequireConsent";
import { useLang } from "@/app/providers";
import { buildDailyRecap, type DailyEntry } from "@/lib/daily";
import { getItem, STORAGE_KEYS, type IssuedLink } from "@/lib/storage";
import type { StoredSignals } from "@/data/syntheticSignals";
import DailyChallenge from "@/components/DailyChallenge";
import FatimaProfileCard from "@/components/FatimaProfileCard";
import type { DemoProfile } from "@/lib/demo";

export default function HistoryPage() {
  const { lang, t } = useLang();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [demoProfile, setDemoProfile] = useState<DemoProfile | null>(null);
  const [signals, setSignals] = useState<StoredSignals | null>(null);
  const [shares, setShares] = useState<IssuedLink[]>([]);
  const [visibleCount, setVisibleCount] = useState(14);

  useEffect(() => {
    setEntries(getItem<DailyEntry[]>(STORAGE_KEYS.dailyHistory) ?? []);
    const profile = getItem<DemoProfile>(STORAGE_KEYS.profile);
    if (profile?.isDemo) setDemoProfile(profile);
    setSignals(getItem<StoredSignals>(STORAGE_KEYS.signals));
    setShares(getItem<IssuedLink[]>(STORAGE_KEYS.shares) ?? []);
  }, []);

  const lastSeven = entries.slice(0, 7);
  const average = useMemo(() => {
    const moods = lastSeven.flatMap((e) => e.mood ? [e.mood] : []);
    return moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : null;
  }, [lastSeven]);

  return (
    <RequireConsent>
      <div className="pt-6 flex flex-col gap-5">
        <div>
          <p className="eyebrow">{lang === "ar" ? "الصورة الكاملة" : "Your whole picture"}</p>
          <h1 className="text-3xl font-bold">{lang === "ar" ? "سجلّك اليومي" : "Your daily history"}</h1>
          <p style={{ color: "var(--muted)" }}>
            {lang === "ar" ? "ما قلته، وما فعلته، وما سجلته أجهزتك — يوماً بعد يوم." : "What you said, did and connected — day by day."}
          </p>
        </div>

        <Link href="/dashboard" className="underline text-sm">{lang === "ar" ? "العودة إلى لوحة البيانات" : "Back to dashboard"}</Link>
        {demoProfile && <FatimaProfileCard profile={demoProfile} />}

        <div className="grid grid-cols-2 gap-3">
          <div className="metric-card"><strong>{entries.length}</strong><span>{lang === "ar" ? "أيام مسجلة" : "days logged"}</span></div>
          <div className="metric-card"><strong>{average ? average.toFixed(1) : "—"}</strong><span>{lang === "ar" ? "متوسط الشعور / 5" : "average mood / 5"}</span></div>
        </div>

        <DailyChallenge />

        {entries.length === 0 ? (
          <div className="card empty-state">
            <span aria-hidden="true">🌱</span>
            <h2 className="font-bold">{lang === "ar" ? "ابدأ بيومك الأول" : "Start your first day"}</h2>
            <p>{lang === "ar" ? "تحتاج أقل من دقيقة." : "It takes less than a minute."}</p>
            <Link href="/checkin" className="btn btn-primary w-full">{lang === "ar" ? "كيف أشعر اليوم؟" : "How do I feel today?"}</Link>
          </div>
        ) : (
          <ol className="timeline">
            {entries.slice(0, visibleCount).map((entry) => {
              const recap = buildDailyRecap(entry, lang, entry.id === entries[0]?.id ? signals : null);
              return (
                <li key={entry.id} className="card timeline-item">
                  <div className="flex items-center justify-between gap-2">
                    <time className="font-bold">{new Date(entry.createdAt).toLocaleDateString(lang === "ar" ? "ar-AE" : "en-GB", { weekday: "long", day: "numeric", month: "short" })}</time>
                    {entry.mood && <span className="mood-dot" aria-label={`${entry.mood} / 5`}>{["", "😞", "😕", "😐", "🙂", "😊"][entry.mood]}</span>}
                  </div>
                  <h2 className="font-bold">{recap.title}</h2>
                  <ul className="recap-list">{recap.lines.map((line, i) => <li key={i}>{line}</li>)}</ul>
                  {recap.watch && <p className="support-note">{recap.watch}</p>}
                  <p className="text-sm" style={{ color: "var(--muted)" }}>{recap.disclaimer}</p>
                </li>
              );
            })}
          </ol>
        )}
        {entries.length > visibleCount && <button type="button" className="btn btn-outline w-full" onClick={() => setVisibleCount(count => count + 14)}>{lang === "ar" ? "عرض المزيد من الأيام" : "Show more days"}</button>}

        <section className="card">
          <h2 className="font-bold">{lang === "ar" ? "المشاركة تحت سيطرتك" : "Sharing stays in your control"}</h2>
          <p style={{ color: "var(--muted)" }}>{lang === "ar" ? `${shares.length} روابط محفوظة على هذا الجهاز.` : `${shares.length} links saved on this device.`}</p>
          <Link href="/share/history" className="btn btn-outline w-full mt-3">{t("share.history")}</Link>
        </section>
        <Link href="/membership" className="btn btn-outline w-full">{lang === "ar" ? "عرض العضوية" : "View membership"}</Link>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/checkin" className="btn btn-primary">{lang === "ar" ? "سجّل اليوم" : "Check in"}</Link>
          <Link href="/connections" className="btn btn-outline">{lang === "ar" ? "المصادر" : "Sources"}</Link>
        </div>
      </div>
    </RequireConsent>
  );
}
