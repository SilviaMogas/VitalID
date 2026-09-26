"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "@/app/providers";
import RequireConsent from "@/components/RequireConsent";
import FatimaExperience from "@/components/FatimaExperience";
import type { AccountProfile } from "@/lib/accountClient";
import { circularDemo, circularDemoTiles } from "@/data/circularDemo";
import { formatSignalValue, type StoredSignals } from "@/data/syntheticSignals";
import { entriesForPeriod, moodBuckets, summarizeDashboard, type DashboardPeriod } from "@/lib/dashboard";
import type { DailyEntry } from "@/lib/daily";
import type { DemoProfile } from "@/lib/demo";
import { getItem, STORAGE_KEYS } from "@/lib/storage";
import { loadWorkFocus, workedMilliseconds, type WorkFocusState } from "@/lib/workFocus";

const PERIODS: DashboardPeriod[] = ["today", "week", "month", "year"];

export default function DashboardPage() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [period, setPeriod] = useState<DashboardPeriod>("week");
  const [profile, setProfile] = useState<DemoProfile | AccountProfile | null>(null);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [signals, setSignals] = useState<StoredSignals | null>(null);
  const [work, setWork] = useState<WorkFocusState | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const savedProfile = getItem<DemoProfile | AccountProfile>(STORAGE_KEYS.profile);
    setProfile(savedProfile);
    setEntries(getItem<DailyEntry[]>(STORAGE_KEYS.dailyHistory) ?? []);
    setSignals(getItem<StoredSignals>(STORAGE_KEYS.signals));
    if (savedProfile) {
      const key = STORAGE_KEYS.workFocus + "." + savedProfile.id;
      setWork(loadWorkFocus(getItem<WorkFocusState>(key)));
    }
    setLoaded(true);
  }, []);

  const now = useMemo(() => new Date(), []);
  const periodEntries = useMemo(() => entriesForPeriod(entries, period, now), [entries, period, now]);
  const summary = useMemo(() => summarizeDashboard(periodEntries), [periodEntries]);
  const buckets = useMemo(() => moodBuckets(periodEntries, period, now, lang), [periodEntries, period, now, lang]);
  const demo = profile?.isDemo === true;
  const displayName = demo ? (ar ? "فاطمة" : "Fátima") : profile?.name ?? (ar ? "مرحباً" : "you");
  const latestTiles = demo ? circularDemoTiles : signals?.tiles ?? [];
  const signalSource = demo ? (ar ? "عينة Circular · ٢٣ سبتمبر ٢٠٢٦" : "Circular sample · 23 Sep 2026") : signals?.source === "whoop"
    ? (ar ? "WHOOP · آخر قراءة متاحة" : "WHOOP · latest available reading")
    : (ar ? "بيانات نموذجية" : "Sample data");
  const workMinutes = work ? Math.floor(workedMilliseconds(work) / 60_000) : 0;

  if (!loaded) return <RequireConsent><p aria-busy="true" className="pt-6">…</p></RequireConsent>;

  if (profile?.isDemo) return <RequireConsent><FatimaExperience profile={profile}/></RequireConsent>;

  return <RequireConsent>
    <div className="pt-6 flex flex-col gap-5" data-testid="dashboard">
      <header className="dashboard-hero">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">{ar ? "لوحة بياناتك" : "Your dashboard"}</p>
          {demo && <span className="badge badge-neutral">{ar ? "وضع تجريبي" : "Demo"}</span>}
        </div>
        <h1 className="text-3xl font-bold">{ar ? "مرحباً " + displayName : "Hello " + displayName}</h1>
        <p>{ar ? "يومك وصحتك وروتينك في مكان واحد." : "Your day, wellbeing and routines in one place."}</p>
        <div className="dashboard-actions">
          <Link href="/checkin" className="btn btn-primary" data-testid="dashboard-checkin">{ar ? "سجّلي يومك" : "Check in today"}</Link>
          <Link href="/connections" className="btn btn-outline">{ar ? "الإعدادات والتطبيقات" : "Settings & apps"}</Link>
        </div>
      </header>

      <section className="flex flex-col gap-3" aria-label={ar ? "الفترة" : "Time period"}>
        <div className="dashboard-periods" role="group" aria-label={ar ? "اختر الفترة" : "Choose time period"}>
          {PERIODS.map(value => <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)} data-testid={"period-" + value}>
            {ar ? ({ today: "اليوم", week: "الأسبوع", month: "الشهر", year: "السنة" } as const)[value] : ({ today: "Today", week: "Week", month: "Month", year: "Year" } as const)[value]}
          </button>)}
        </div>
        <p className="text-sm" style={{ color: "var(--muted)" }}>{demo
          ? (ar ? "اتجاهات اليوميات بيانات خيالية لفاطمة؛ قراءات Circular أدناه لقطة واحدة فقط." : "Diary trends are Fátima’s fictional demo data. Circular below is one snapshot, not a year of ring readings.")
          : (ar ? "تعرض هذه الأرقام ما سجلته فقط في الفترة المختارة." : "These figures use only what you recorded in the selected period.")}</p>
      </section>

      <section className="dashboard-metrics" data-testid="period-summary" aria-label={ar ? "ملخص الفترة" : "Period summary"}>
        <div className="dashboard-metric"><strong>{summary.daysLogged}</strong><span>{ar ? "أيام مسجلة" : "days logged"}</span></div>
        <div className="dashboard-metric"><strong>{summary.averageMood === null ? "—" : summary.averageMood.toFixed(1) + "/5"}</strong><span>{ar ? "متوسط الشعور" : "average mood"}</span></div>
        <div className="dashboard-metric"><strong>{summary.movementMinutes}</strong><span>{ar ? "دقائق حركة" : "movement minutes"}</span></div>
        <div className="dashboard-metric"><strong>{summary.activeDays}</strong><span>{ar ? "أيام نشطة" : "active days"}</span></div>
      </section>

      <section className="card flex flex-col gap-3" data-testid="mood-chart">
        <div><h2 className="text-xl font-bold">{ar ? "كيف كان شعورك" : "How you felt"}</h2><p className="text-sm" style={{ color: "var(--muted)" }}>{ar ? "متوسط الشعور الذي سجلته، من ١ إلى ٥." : "Average recorded mood, from 1 to 5."}</p></div>
        {summary.daysLogged === 0 ? <p>{ar ? "لا توجد يوميات في هذه الفترة بعد." : "No check-ins in this period yet."}</p> : <div className="dashboard-bars" style={{ gridTemplateColumns: "repeat(" + buckets.length + ", minmax(0, 1fr))" }}>
          {buckets.map((bucket, index) => <div className="dashboard-bar-column" key={index} title={bucket.label + ": " + (bucket.average?.toFixed(1) ?? "—")}>
            <div className="dashboard-bar-track"><div className="dashboard-bar" style={{ height: (bucket.average === null ? 0 : bucket.average / 5 * 100) + "%" }} /></div>
            <small>{bucket.label}</small>
          </div>)}
        </div>}
      </section>

      <section className="card flex flex-col gap-3" data-testid="wearable-snapshot">
        <div className="flex items-center justify-between gap-2"><h2 className="text-xl font-bold">{ar ? "آخر قراءة من جهاز" : "Latest wearable snapshot"}</h2>{latestTiles.length > 0 && <span className="badge badge-neutral">{demo ? (ar ? "عينة" : "Sample") : signals?.source === "whoop" ? (ar ? "مباشر" : "Live source") : (ar ? "عينة" : "Sample")}</span>}</div>
        {latestTiles.length === 0 ? <p style={{ color: "var(--muted)" }}>{ar ? "لا توجد قراءات جهاز بعد. يمكنك مراجعة التطبيقات في الإعدادات." : "No wearable readings yet. Review apps in Settings."}</p> : <>
          <p className="text-sm" style={{ color: "var(--muted)" }}>{signalSource}</p>
          <div className="dashboard-signal-grid">
            {latestTiles.filter(tile => ["sleep", "rhr", "hrv"].includes(tile.key)).map(tile => <div key={tile.id}><strong>{formatSignalValue(tile, lang)}</strong><span>{tile.key === "sleep" ? (ar ? "نوم" : "Sleep") : tile.key === "rhr" ? (ar ? "نبض الراحة" : "Resting pulse") : "HRV"}</span></div>)}
            {demo && <><div><strong>{circularDemo.sleepScore}/100</strong><span>{ar ? "جودة النوم" : "Sleep score"}</span></div><div><strong>{circularDemo.steps.toLocaleString(ar ? "ar" : "en")}</strong><span>{ar ? "خطوات" : "Steps"}</span></div></>}
          </div>
          <Link href="/signals" className="underline text-sm">{ar ? "افتحي تفاصيل القراءة" : "View signal details"}</Link>
        </>}
      </section>

      <section className="dashboard-two">
        <div className="card flex flex-col gap-3">
          <h2 className="text-xl font-bold">{ar ? "الطعام والفيتامينات" : "Food & vitamins"}</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>{summary.latestFood ?? (ar ? "لا يوجد طعام مسجل في هذه الفترة." : "No food logged in this period.")}</p>
          {demo && <p className="text-sm">{ar ? "في ملف فاطمة: فيتامين د، ب١٢، وج من الطعام." : "In Fátima’s log: vitamin D, B12 and vitamin C from food."}</p>}
          <Link href="/checkin" className="underline text-sm">{ar ? "أضيفي وجبة" : "Add a food note"}</Link>
        </div>
        <div className="card flex flex-col gap-3">
          <h2 className="text-xl font-bold">{ar ? "العمل والاستراحات" : "Work & breaks"}</h2>
          <p><strong>{Math.floor(workMinutes / 60)}h {workMinutes % 60}m</strong> <span className="text-sm" style={{ color: "var(--muted)" }}>{ar ? "عمل مسجل اليوم" : "work logged today"}</span></p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>{ar ? "الحد اليومي: " : "Daily limit: "}{work ? Math.round(work.dailyLimitMinutes / 60) : 8} {ar ? "ساعات" : "hours"}</p>
          <Link href="/focus" className="underline text-sm">{ar ? "افتحي مؤقت الاستراحة" : "Open break timer"}</Link>
        </div>
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="text-xl font-bold">{ar ? "من يومياتك" : "From your diary"}</h2>
        {summary.latestNote ? <p className="dashboard-note">{summary.latestNote}</p> : <p style={{ color: "var(--muted)" }}>{ar ? "لم تكتبي ملاحظة في هذه الفترة بعد." : "No note in this period yet."}</p>}
        <Link href="/history" className="underline text-sm">{ar ? "عرض اليوميات" : "View daily history"}</Link>
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="text-xl font-bold">{ar ? "تطبيقاتك" : "Your apps"}</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>{demo
          ? (ar ? "مصادر فاطمة في العرض: Circular وPLAUD وWHOOP وCronometer وRENPHO. ليست اتصالات حية بحساباتها." : "Fátima’s demo sources: Circular, PLAUD, WHOOP, Cronometer and RENPHO. Her accounts are not connected live.")
          : (ar ? "أديري مصادر البيانات وموافقتك من الإعدادات." : "Manage data sources and consent in Settings.")}</p>
        <Link href="/connections" className="underline text-sm">{ar ? "الإعدادات والتطبيقات" : "Settings & apps"}</Link>
      </section>

      <section className="dashboard-share">
        <h2 className="font-bold">{ar ? "مشاركة اختيارية" : "Sharing is optional"}</h2>
        <p className="text-sm">{ar ? "إذا أردتِ مشاركة ملخص مع طبيب أو شخص تثقين به، تختارين ما يراه ومدة صلاحية الرابط. لا يُشارك هذا الداشبورد تلقائياً." : "If you want to share a summary with a doctor or someone you trust, you choose what they see and when the link expires. This dashboard is never shared automatically."}</p>
        <Link href="/share" className="underline text-sm">{ar ? "اختاري ما تريدين مشاركته" : "Choose what to share"}</Link>
      </section>
    </div>
  </RequireConsent>;
}
