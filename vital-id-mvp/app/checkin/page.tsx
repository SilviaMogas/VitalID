"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLang } from "../providers";
import RequireConsent from "@/components/RequireConsent";
import { getItem, removeItem, setItem, STORAGE_KEYS } from "@/lib/storage";
import { localDateKey, upsertDaily, type DailyEntry, type Energy, type Mood } from "@/lib/daily";
import { sampleTranscript } from "@/data/sampleTranscript";
import { createFatimaProfile, type DemoProfile } from "@/lib/demo";
import type { AccountProfile } from "@/lib/accountClient";
import VoiceDictation from "@/components/VoiceDictation";
import DailyChallenge from "@/components/DailyChallenge";
import FatimaCoach from "@/components/FatimaCoach";
import FatimaProfileCard from "@/components/FatimaProfileCard";
import WorkdayNudge from "@/components/WorkdayNudge";

interface Recording { id: string; name: string; startAt: string | null; durationMs: number; }
function fmtDuration(ms: number) { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }

const moodEmoji = ["", "😞", "😕", "😐", "🙂", "😊"];
const moodText = {
  ar: ["", "صعب جداً", "صعب", "عادي", "جيد", "جيد جداً"],
  en: ["", "Very difficult", "Difficult", "Okay", "Good", "Very good"],
};

export default function CheckinPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [text, setText] = useState("");
  const [mood, setMood] = useState<Mood | null>(null);
  const [energy, setEnergy] = useState<Energy | null>(null);
  const [movement, setMovement] = useState("");
  const [movementMinutes, setMovementMinutes] = useState("");
  const [food, setFood] = useState("");
  const [source, setSource] = useState<DailyEntry["source"]>("manual");
  const [clipError, setClipError] = useState(false);
  const [recordings, setRecordings] = useState<Recording[] | null>(null);
  const [plaudError, setPlaudError] = useState(false);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [importedFrom, setImportedFrom] = useState<string | null>(null);
  const [profile, setProfile] = useState<DemoProfile | AccountProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const storedProfile = getItem<DemoProfile | AccountProfile>(STORAGE_KEYS.profile);
    if (storedProfile?.isDemo && (!storedProfile.goals?.length || !storedProfile.connectedApps?.includes("cronometer") || !storedProfile.connectedApps?.includes("renpho"))) {
      const updated = createFatimaProfile(storedProfile.joinedAt);
      setItem(STORAGE_KEYS.profile, updated);
      setProfile(updated);
    } else setProfile(storedProfile);
    const today = localDateKey();
    const prior = (getItem<DailyEntry[]>(STORAGE_KEYS.dailyHistory) ?? []).find(e => e.date === today);
    if (prior) {
      setText(prior.note); setMood(prior.mood); setEnergy(prior.energy);
      setMovement(prior.movement); setMovementMinutes(prior.movementMinutes ? String(prior.movementMinutes) : "");
      setFood(prior.food); setSource(prior.source);
    } else {
      const saved = getItem<string>(STORAGE_KEYS.transcript);
      if (saved) setText(saved);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (getItem<DemoProfile>(STORAGE_KEYS.profile)?.isDemo) return;
    fetch("/api/plaud/recordings").then(r => r.json()).then((d: { configured?: boolean; recordings?: Recording[] }) => {
      if (!cancelled && d.configured) setRecordings(d.recordings ?? []);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const importRecording = async (recording: Recording) => {
    setPlaudError(false); setFetchingId(recording.id);
    try {
      const res = await fetch(`/api/plaud/recordings/${recording.id}/transcript`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json() as { text: string; name: string };
      setText(data.text); setImportedFrom(data.name); setSource("plaud");
    } catch { setPlaudError(true); } finally { setFetchingId(null); }
  };

  const paste = async () => {
    setClipError(false);
    try { const value = await navigator.clipboard.readText(); if (value) { setText(value); setSource("manual"); } else setClipError(true); }
    catch { setClipError(true); }
  };

  const saveAndContinue = async () => {
    setSaveError(""); setSaving(true);
    const now = Date.now();
    const date = localDateKey();
    const entry: DailyEntry = {
      id: `day-${date}`, date, createdAt: now, mood, energy, note: text.trim(),
      movement: movement.trim(), movementMinutes: movementMinutes ? Math.max(0, Number(movementMinutes)) : null,
      food: food.trim(), source,
    };
    if (profile && !profile.isDemo) {
      try {
        const response = await fetch("/api/account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entry) });
        if (!response.ok) throw new Error("Your entry could not be saved to Supabase. Please try again.");
      } catch (reason) {
        setSaveError(reason instanceof Error ? reason.message : "Could not save your entry.");
        setSaving(false); return;
      }
    }
    const history = upsertDaily(getItem<DailyEntry[]>(STORAGE_KEYS.dailyHistory) ?? [], entry);
    setItem(STORAGE_KEYS.dailyHistory, history);
    setItem(STORAGE_KEYS.currentDaily, entry);
    setItem(STORAGE_KEYS.transcript, entry.note);
    removeItem(STORAGE_KEYS.summary);
    router.push("/signals");
  };

  return (
    <RequireConsent>
      <div className="pt-6 flex flex-col gap-6">
        <header className="human-checkin">
          <p className="eyebrow">{new Date().toLocaleDateString(lang === "ar" ? "ar-AE" : "en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="text-3xl font-bold">{profile ? (lang === "ar" ? `مرحباً ${profile.name}، كيف حالك اليوم؟` : `Hi ${profile.name}, how are you today?`) : (lang === "ar" ? "كيف تشعر اليوم؟" : "How are you feeling today?")}</h1>
          <p>{lang === "ar" ? "احكِها بطريقتك. دقيقة واحدة تكفي." : "Tell it in your own way. One minute is enough."}</p>
        </header>

        {profile?.isDemo && <FatimaCoach profile={profile} mood={mood} onNote={note => { setText(previous => previous ? previous + "\n" + note : note); setSource("manual"); }} />}
        {profile?.isDemo && <FatimaProfileCard profile={profile} />}
        {profile && <WorkdayNudge profile={profile} />}

        <fieldset className="card">
          <legend className="font-bold">{lang === "ar" ? "اختر أقرب شعور" : "Choose the closest feeling"}</legend>
          <div className="mood-picker">
            {([1,2,3,4,5] as Mood[]).map(value => (
              <button key={value} type="button" className="mood-button" data-selected={mood === value}
                aria-pressed={mood === value} aria-label={moodText[lang][value]} onClick={() => setMood(value)}>
                <span aria-hidden="true">{moodEmoji[value]}</span><small>{moodText[lang][value]}</small>
              </button>
            ))}
          </div>
        </fieldset>

        {profile?.isDemo && <section className="context-prompt" data-testid="personal-prompt">
          <span aria-hidden="true">💬</span>
          <div><span className="badge badge-warn">{lang === "ar" ? "سؤال لك" : "A question for you"}</span><p className="font-bold">{lang === "ar" ? "كيف كان اجتماعك مع المستثمر؟" : "How did the meeting with the investor go?"}</p></div>
        </section>}

        <DailyChallenge />

        <section className="card flex flex-col gap-4">
          <div>
            <h2 className="font-bold">{lang === "ar" ? "ماذا يحدث اليوم؟" : "What's going on today?"}</h2>
            <p style={{ color: "var(--muted)" }}>{lang === "ar" ? "تحدث، اكتب، الصق أو استورد من PLAUD." : "Speak, type, paste or import from PLAUD."}</p>
          </div>
          <VoiceDictation onFinal={spoken => { setText(prev => (prev ? prev + " " : "") + spoken); setSource("voice"); }} />
          <textarea rows={6} value={text} onChange={e => { setText(e.target.value); setSource("manual"); }}
            placeholder={profile?.isDemo ? (lang === "ar" ? "مثال: سار الاجتماع جيداً وشعرت بالحماس، لكنه كان يوماً طويلاً…" : "For example: the meeting went well and I felt excited, but it was a long day…") : (lang === "ar" ? "مثال: نمت جيداً، أشعر بطاقة أكبر، لكن كتفي يؤلمني قليلاً…" : "For example: I slept well and have more energy, but my shoulder feels a little sore…")}
            aria-label={lang === "ar" ? "كيف تشعر اليوم؟" : "How are you feeling today?"} />
          <div className="grid grid-cols-2 gap-2">
            <button className="btn btn-outline" onClick={paste}>{t("checkin.paste")}</button>
            <button className="btn btn-outline" onClick={() => { setText(sampleTranscript[lang]); setSource("sample"); }}>{t("checkin.sample")}</button>
          </div>
          {clipError && <p role="alert" style={{ color: "var(--error)" }}>{t("checkin.paste.fail")}</p>}
        </section>

        {recordings !== null && (
          <details className="card">
            <summary className="font-bold cursor-pointer">{t("checkin.plaud.title")}</summary>
            <ul className="flex flex-col gap-2 mt-3">
              {recordings.length === 0 && <li style={{ color: "var(--muted)" }}>{t("checkin.plaud.empty")}</li>}
              {recordings.map(recording => (
                <li key={recording.id}><button className="btn btn-outline w-full justify-start" onClick={() => importRecording(recording)} disabled={fetchingId !== null}>
                  <span className="flex flex-col items-start text-start"><strong>{fetchingId === recording.id ? t("checkin.plaud.fetching") : recording.name}</strong>
                  <small>{recording.startAt ? new Date(recording.startAt).toLocaleString(lang === "ar" ? "ar-AE" : "en-GB") : ""}{recording.durationMs ? ` · ${fmtDuration(recording.durationMs)}` : ""}</small></span>
                </button></li>
              ))}
            </ul>
          </details>
        )}
        {plaudError && <p role="alert" style={{ color: "var(--error)" }}>{t("checkin.plaud.error")}</p>}
        {importedFrom && <p className="text-sm">{t("checkin.plaud.imported")} · {importedFrom}</p>}

        <fieldset className="card">
          <legend className="font-bold">{lang === "ar" ? "كيف طاقتك؟" : "How is your energy?"}</legend>
          <div className="segmented">
            {(["low","steady","high"] as Energy[]).map(value => (
              <button type="button" key={value} aria-pressed={energy === value} data-selected={energy === value} onClick={() => setEnergy(value)}>
                {lang === "ar" ? ({ low: "منخفضة", steady: "مستقرة", high: "مرتفعة" } as const)[value] : ({ low: "Low", steady: "Steady", high: "High" } as const)[value]}
              </button>
            ))}
          </div>
        </fieldset>

        <section className="card flex flex-col gap-3">
          <h2 className="font-bold">{lang === "ar" ? "الحركة والتمارين" : "Movement & exercise"}</h2>
          <input type="text" value={movement} onChange={e => setMovement(e.target.value)} placeholder={lang === "ar" ? "مشي، يوغا، جيم، علاج طبيعي…" : "Walk, yoga, gym, physio…"} />
          <label className="text-sm font-semibold">{lang === "ar" ? "الدقائق (اختياري)" : "Minutes (optional)"}
            <input type="number" min="0" max="1440" inputMode="numeric" value={movementMinutes} onChange={e => setMovementMinutes(e.target.value)} />
          </label>
        </section>

        <section className="card flex flex-col gap-3">
          <h2 className="font-bold">{lang === "ar" ? "الطعام والترطيب" : "Food & hydration"}</h2>
          <textarea rows={3} value={food} onChange={e => setFood(e.target.value)}
            placeholder={lang === "ar" ? "مثال: فطور خفيف، لتر ماء، لم أشعر بالجوع…" : "For example: light breakfast, one litre of water, low appetite…"} />
        </section>

        <Link href="/connections" className="connection-callout">
          <span aria-hidden="true">＋</span>
          <span><strong>{lang === "ar" ? "اربط مصادر بياناتك" : "Connect your data sources"}</strong><small>{lang === "ar" ? "WHOOP وPLAUD وApple Health والطعام" : "WHOOP, PLAUD, Apple Health and food"}</small></span>
        </Link>

        <p className="text-sm" style={{ color: "var(--muted)" }}>{lang === "ar" ? "أنت تتحكم بما تحفظه وما تشاركه. Vital ID يصف الأنماط ولا يشخّص." : "You control what is saved and shared. Vital ID describes patterns; it does not diagnose."}</p>
        {saveError && <p role="alert">{saveError}</p>}
        <button className="btn btn-primary w-full" disabled={!text.trim() || saving} onClick={saveAndContinue} aria-label={t("checkin.continue")}>
          {lang === "ar" ? "احفظ يومي واربط الإشارات" : "Save my day and add signals"}
        </button>
        <Link href="/history" className="btn btn-outline w-full">{lang === "ar" ? "عرض السجل اليومي" : "View daily history"}</Link>
      </div>
    </RequireConsent>
  );
}
