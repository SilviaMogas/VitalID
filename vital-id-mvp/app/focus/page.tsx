"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RequireConsent from "@/components/RequireConsent";
import { useLang } from "@/app/providers";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";
import type { AccountProfile } from "@/lib/accountClient";
import type { DemoProfile } from "@/lib/demo";
import {
  advanceTimer, freshWorkFocus, loadWorkFocus, overworkReason, pauseTimer,
  resetTimer, startTimer, startWork, stopWork, workedMilliseconds,
  type WorkFocusState,
} from "@/lib/workFocus";

function duration(milliseconds: number, ar: boolean): string {
  const minutes = Math.floor(milliseconds / 60_000);
  const hours = Math.floor(minutes / 60);
  return ar ? String(hours) + " س " + String(minutes % 60) + " د" : String(hours) + "h " + String(minutes % 60) + "m";
}

function clock(seconds: number): string {
  const safe = Math.max(0, seconds);
  return String(Math.floor(safe / 60)).padStart(2, "0") + ":" + String(safe % 60).padStart(2, "0");
}

export default function FocusPage() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [state, setState] = useState<WorkFocusState>(() => freshWorkFocus(0));
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [name, setName] = useState("Fátima");
  const [now, setNow] = useState(0);

  useEffect(() => {
    const profile = getItem<DemoProfile | AccountProfile>(STORAGE_KEYS.profile);
    const key = STORAGE_KEYS.workFocus + "." + (profile?.id ?? "guest");
    setStorageKey(key);
    setName(profile?.isDemo ? (lang === "ar" ? "فاطمة" : "Fátima") : profile?.name ?? (lang === "ar" ? "أنت" : "you"));
    const loaded = loadWorkFocus(getItem<WorkFocusState>(key), Date.now());
    setState(advanceTimer(loaded, Date.now()));
    setNow(Date.now());
  }, [lang]);

  useEffect(() => {
    if (storageKey) setItem(storageKey, state);
  }, [state, storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    const interval = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      setState(previous => advanceTimer(previous, current));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [storageKey]);

  const update = (change: (previous: WorkFocusState, current: number) => WorkFocusState) => {
    const current = Date.now();
    setState(previous => change(advanceTimer(previous, current), current));
    setNow(current);
  };

  const timerSeconds = state.timerEndsAt === null
    ? state.remainingSeconds
    : Math.max(0, Math.ceil((state.timerEndsAt - now) / 1000));
  const workTime = workedMilliseconds(state, now);
  const reason = overworkReason(state, now);
  const invalidSchedule = state.workEnd <= state.workStart;
  const modeName = state.mode === "focus"
    ? (ar ? "وقت التركيز" : "Focus time")
    : state.mode === "longBreak" ? (ar ? "استراحة طويلة" : "Long break") : (ar ? "استراحة قصيرة" : "Short break");

  return <RequireConsent>
    <div className="pt-6 flex flex-col gap-5">
      <div>
        <p className="eyebrow">{ar ? "يوم العمل" : "Your workday"}</p>
        <h1 className="text-3xl font-bold">{ar ? "عمل بإيقاع ألطف" : "Make room for breaks"}</h1>
        <p style={{ color: "var(--muted)" }}>{ar ? "حددي ساعاتك، وسنذكرك بالتوقف عندما يطول العمل." : "Set your hours. We’ll remind you to pause when work runs long."}</p>
      </div>

      <section className="card flex flex-col gap-4" data-testid="workday-settings">
        <div><h2 className="text-xl font-bold">{ar ? "ساعات العمل" : "Work hours"}</h2><p className="text-sm" style={{ color: "var(--muted)" }}>{ar ? "تُحفظ في هذا المتصفح لهذا الحساب." : "Saved in this browser for this account."}</p></div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 font-semibold">{ar ? "البداية" : "Start"}<input type="time" value={state.workStart} onChange={event => setState(previous => ({ ...previous, workStart: event.target.value }))} /></label>
          <label className="flex flex-col gap-1 font-semibold">{ar ? "النهاية" : "Finish"}<input type="time" value={state.workEnd} onChange={event => setState(previous => ({ ...previous, workEnd: event.target.value }))} /></label>
        </div>
        {invalidSchedule && <p role="alert" style={{ color: "var(--error)" }}>{ar ? "اجعلي وقت النهاية بعد وقت البداية في اليوم نفسه." : "Finish time must be after start time on the same day."}</p>}
        <label className="flex flex-col gap-1 font-semibold">{ar ? "حد العمل اليومي" : "Daily work limit"}
          <select value={state.dailyLimitMinutes} onChange={event => setState(previous => ({ ...previous, dailyLimitMinutes: Number(event.target.value) }))}>
            {[4, 6, 8, 10, 12].map(hours => <option key={hours} value={hours * 60}>{hours} {ar ? "ساعات" : "hours"}</option>)}
          </select>
        </label>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p><strong>{duration(workTime, ar)}</strong> <span style={{ color: "var(--muted)" }}>{ar ? "عمل مسجل اليوم" : "logged today"}</span></p>
          <button className="btn btn-outline" type="button" disabled={invalidSchedule || (state.mode !== "focus" && state.timerEndsAt !== null)} onClick={() => update((previous, current) => previous.workingSince === null ? startWork(previous, current) : stopWork(previous, current))} data-testid="work-toggle">
            {state.workingSince === null ? (ar ? "بدء العمل" : "Start work") : (ar ? "إنهاء العمل" : "Stop work")}
          </button>
        </div>
        {reason && <p className="work-overrun" role="alert" data-testid="overwork-alert">
          {reason === "limit"
            ? (ar ? name + "، لقد تجاوزتِ حد العمل الذي حددتِه اليوم. خذي استراحة أو أنهي العمل عندما تستطيعين." : name + ", you’ve reached the work limit you set for today. Take a break or wrap up when you can.")
            : (ar ? name + "، انتهى وقت العمل الذي خططتِ له وما زلتِ تعملين. هل حان وقت استراحة؟" : name + ", your planned workday has ended and you’re still working. Is it time for a break?")}
        </p>}
      </section>

      <section className="card flex flex-col gap-4 items-center text-center" data-testid="pomodoro">
        <div><p className="eyebrow">Pomodoro</p><h2 className="text-xl font-bold">{modeName}</h2></div>
        <div className="focus-clock" role="timer" aria-label={modeName}>{clock(timerSeconds)}</div>
        <p style={{ color: "var(--muted)" }}>{state.mode === "focus"
          ? (ar ? "25 دقيقة تركيز، ثم 5 دقائق راحة. بعد أربع جلسات، استراحة 15 دقيقة." : "Focus for 25 minutes, then rest for 5. After four sessions, take 15 minutes.")
          : (ar ? "وقت لتبتعدي قليلاً عن العمل. اشربي ماءً أو تحركي برفق." : "Step away from work for a moment. Have water or move gently.")}</p>
        <div className="flex gap-2 flex-wrap justify-center">
          <button type="button" className="btn btn-primary" disabled={invalidSchedule} onClick={() => update((previous, current) => previous.timerEndsAt === null ? startTimer(previous, current) : pauseTimer(previous, current))} data-testid="timer-toggle">{state.timerEndsAt === null ? (ar ? "ابدئي" : "Start timer") : (ar ? "إيقاف مؤقت" : "Pause timer")}</button>
          <button type="button" className="btn btn-outline" onClick={() => update(resetTimer)}>{ar ? "إعادة الضبط" : "Reset"}</button>
        </div>
        <p className="text-sm" role="status">{state.mode !== "focus" && state.timerEndsAt === null
          ? (ar ? "انتهت جلسة التركيز. ابدئي الاستراحة عندما تكونين مستعدة." : "Focus session complete. Start your break when you’re ready.")
          : (ar ? "جلسات التركيز المكتملة اليوم: " : "Focus sessions completed today: ") + state.completedFocus}</p>
      </section>
      <Link href="/checkin" className="btn btn-outline w-full">{ar ? "العودة إلى يومياتي" : "Back to my day"}</Link>
    </div>
  </RequireConsent>;
}
