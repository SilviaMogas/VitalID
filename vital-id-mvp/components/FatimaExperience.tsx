"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useLang } from "@/app/providers";
import VoiceDictation from "@/components/VoiceDictation";
import { useVoice } from "@/components/VoiceProvider";
import { demoApps, demoDays, demoPeriod } from "@/lib/demoExperience";
import { localDateKey, upsertDaily, type DailyEntry, type Mood } from "@/lib/daily";
import type { DashboardPeriod } from "@/lib/dashboard";
import type { DemoProfile } from "@/lib/demo";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";

const CHECKIN_KEY = "vitalid.fatima.reflection";
const PLAN_KEY = "vitalid.fatima.tomorrow";
const APPS_KEY = "vitalid.fatima.demoApps";
const faces = ["😔", "😕", "😐", "🙂", "😊"];
type Panel = "day" | "profile" | "settings";
type View = "overview" | "journal" | "plan";
type DetailMetric = "recovery" | "sleepMinutes" | "strain";

export function FatimaPortrait() {
  return <svg viewBox="0 0 100 100" role="img" aria-label="Fátima — illustrated demo portrait" className="fatima-portrait">
    <defs><linearGradient id="portrait-bg" x2="1" y2="1"><stop stopColor="#ded9f5"/><stop offset="1" stopColor="#f5d6c4"/></linearGradient></defs>
    <rect width="100" height="100" rx="50" fill="url(#portrait-bg)"/>
    <path d="M19 91V45C18 8 77 4 82 42l3 48" fill="#332831"/>
    <path d="M14 100c2-23 18-31 36-31s37 9 38 31" fill="#4a5b4e"/>
    <path d="M42 61h18v19q-9 9-18 0" fill="#be805f"/>
    <ellipse cx="50" cy="44" rx="23" ry="29" fill="#dca080"/>
    <path d="M25 39q-4-25 25-27 31 3 25 29-12-4-23-23-9 17-27 21" fill="#332831"/>
    <path d="M32 41q6-4 11-1m14 0q6-3 11 1" stroke="#513829" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <ellipse cx="39" cy="46" rx="2.5" ry="3" fill="#362b29"/><ellipse cx="62" cy="46" rx="2.5" ry="3" fill="#362b29"/>
    <path d="M50 47l-3 9h5" stroke="#b97c5d" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    <path d="M40 62q11 11 21-1" fill="#fff5e9" stroke="#a45f55" strokeWidth="2" strokeLinejoin="round"/>
    <circle cx="27" cy="55" r="2.5" fill="#e9c477"/><circle cx="73" cy="55" r="2.5" fill="#e9c477"/>
  </svg>;
}

function Sprout({ children, celebrate = false }: { children: React.ReactNode; celebrate?: boolean }) {
  return <aside className={"vl-sprout" + (celebrate ? " celebrating" : "")}>
    <svg viewBox="0 0 100 110" aria-hidden="true" className="vl-broccoli">
      <path d="M42 63L36 101q14 7 28 0l-7-38" fill="#bad879" stroke="#244d33" strokeWidth="3"/>
      <path d="M39 83L20 69m41 15 19-20" stroke="#244d33" strokeWidth="4" strokeLinecap="round"/>
      <path d="M20 65C2 60 5 37 19 34 9 12 35 6 44 18 55 0 78 10 77 27 99 24 106 54 85 63 78 81 58 75 49 70 36 80 23 76 20 65Z" fill="#6aab62" stroke="#244d33" strokeWidth="3"/>
      <g className="vl-sprout-eyes" fill="#20362a"><circle cx="36" cy="49" r="4"/><circle cx="63" cy="49" r="4"/></g>
      <path d="M41 61q10 11 19-1" fill="none" stroke="#20362a" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="28" cy="59" r="5" fill="#dfae8a" opacity=".65"/><circle cx="71" cy="59" r="5" fill="#dfae8a" opacity=".65"/>
    </svg><div>{children}</div>
  </aside>;
}

function MetricRing({ value, label, detail, color, progress, onOpen }: { value: string; label: string; detail: string; color: string; progress: number; onOpen: () => void }) {
  return <button type="button" onClick={onOpen} className="vl-ring-card"><div className="vl-ring" style={{ "--ring-color": color, "--ring-progress": Math.max(0, Math.min(100, progress)) + "%" } as CSSProperties}><div><strong>{value}</strong></div></div><h3>{label}</h3><small>{detail} · ↗</small></button>;
}

export default function FatimaExperience({ profile }: { profile: DemoProfile }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const say = (en: string, arabic: string) => ar ? arabic : en;
  const voice = useVoice();
  const [panel, setPanel] = useState<Panel>("day");
  const [view, setView] = useState<View>("overview");
  const [detailMetric, setDetailMetric] = useState<DetailMetric | null>(null);
  const [period, setPeriod] = useState<DashboardPeriod>("today");
  const [mood, setMood] = useState<Mood | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [goal, setGoal] = useState("");
  const [planSaved, setPlanSaved] = useState(false);
  const [gentleStep, setGentleStep] = useState("");
  const [breathing, setBreathing] = useState(false);
  const [breathSecond, setBreathSecond] = useState(0);
  const [apps, setApps] = useState<string[]>(demoApps.map(app => app.id));
  const now = useMemo(() => new Date(), []);
  const days = useMemo(() => demoDays(now), [now]);
  const selected = useMemo(() => demoPeriod(days, period, now), [days, period, now]);
  const baseline = useMemo(() => demoPeriod(days.slice(1), "week", new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)), [days, now]);
  const recovery = Math.round(selected.average("recovery"));
  const recoveryColor = recovery >= 67 ? "#a7e46b" : recovery >= 34 ? "#efd05b" : "#ef7770";
  const sleep = Math.round(selected.average("sleepMinutes"));
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const dateLabel = now.toLocaleDateString(ar ? "ar-AE" : "en-GB", { weekday: "long", day: "numeric", month: "long" });
  const [reflection, setReflection] = useState("");
  const [reflectionSaved, setReflectionSaved] = useState(false);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [panel, view]);

  useEffect(() => {
    const old = getItem<{date:string; mood:Mood|null; note:string; reflection?:string}>(CHECKIN_KEY);
    if (old?.date === localDateKey()) { setMood(old.mood); setNote(old.note); setReflection(old.reflection ?? ""); setSaved(true); }
    const plan = getItem<{date:string; goal:string; step:string}>(PLAN_KEY);
    const next = new Date(); next.setDate(next.getDate() + 1);
    if (plan?.date === localDateKey(next)) { setGoal(plan.goal); setGentleStep(plan.step); setPlanSaved(true); }
    setApps(getItem<string[]>(APPS_KEY) ?? demoApps.map(app => app.id));
  }, []);

  useEffect(() => {
    if (!breathing) return;
    const timer = setInterval(() => setBreathSecond(value => {
      if (value >= 23) { setBreathing(false); return 0; }
      return value + 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [breathing]);

  const saveFeeling = () => {
    const date = localDateKey();
    setItem(CHECKIN_KEY, { date, mood, note: note.trim(), reflection });
    const history = getItem<DailyEntry[]>(STORAGE_KEYS.dailyHistory) ?? [];
    const previous = history.find(entry => entry.date === date);
    const entry: DailyEntry = { id: previous?.id ?? "day-" + date, date, createdAt: Date.now(), mood, energy: previous?.energy ?? null,
      note: note.trim(), movement: previous?.movement ?? "", movementMinutes: previous?.movementMinutes ?? null,
      food: previous?.food ?? "", source: "manual", demo: true };
    setItem(STORAGE_KEYS.dailyHistory, upsertDaily(history, entry));
    setItem(STORAGE_KEYS.currentDaily, entry);
    setSaved(true); setReflectionSaved(false);
    window.dispatchEvent(new Event("vitalid:celebrate"));
  };
  const savePlan = () => {
    setItem(PLAN_KEY, { date: localDateKey(tomorrow), goal: goal.trim(), step: gentleStep });
    setPlanSaved(true); window.dispatchEvent(new Event("vitalid:celebrate"));
  };
  const toggleApp = (id: string) => {
    const next = apps.includes(id) ? apps.filter(value => value !== id) : [...apps, id];
    setApps(next); setItem(APPS_KEY, next);
  };
  const carePrompt = mood && mood <= 2
    ? say("That sounds like a lot to carry. What felt hardest today, and what would make this evening a little easier?", "يبدو أن اليوم كان ثقيلاً. ما أصعب شيء اليوم؟ وما الذي قد يجعل المساء أسهل قليلاً؟")
    : mood === 3
      ? say("You don’t have to make every day a great day. What took energy from you, and what gave a little back?", "ليس ضرورياً أن يكون كل يوم رائعاً. ما الذي استنزف طاقتك؟ وما الذي أعاد لك بعضاً منها؟")
      : say("Let’s notice what supported you. Which moment felt good today, and what would you like to carry into tomorrow?", "لنلاحظ ما دعمك اليوم. أي لحظة كانت جميلة؟ وماذا تريدين أن تأخذي معك إلى الغد؟");

  return <div className="vl-experience" data-testid="dashboard">
    <div className="vl-demo-line"><span>VITA LADY</span><span>{say("DEMO · simulated connected apps", "تجريبي · اتصالات محاكاة")}</span></div>
    <header className="vl-user-header">
      <button type="button" onClick={() => setPanel("profile")} className="vl-avatar-button" aria-label={say("Open Fátima’s profile", "افتحي ملف فاطمة")}><FatimaPortrait/></button>
      <div><p>{dateLabel}</p><h1>{say("Hey Fátima", "أهلاً فاطمة")} </h1><small>{say("Your daily performance & wellbeing.", "أداؤك ورفاهيتك اليومية.")}</small></div>
      <button type="button" className="vl-settings-button" onClick={() => setPanel(panel === "settings" ? "day" : "settings")} aria-label={say("Settings & apps", "الإعدادات والتطبيقات")}>⚙</button>
    </header>
    <nav className="vl-main-nav" aria-label={say("Your space", "مساحتك")}>
      {(["overview", "journal", "plan"] as View[]).map(item => <button key={item} aria-current={panel === "day" && view === item ? "page" : undefined} onClick={() => {setPanel("day");setView(item);}}>{say(({overview:"Data",journal:"Journal",plan:"Tomorrow"})[item],({overview:"البيانات",journal:"اليوميات",plan:"غداً"})[item])}</button>)}
    </nav>
    {panel === "profile" ? <section className="vl-panel vl-profile" data-testid="experience-profile">
      <div className="vl-profile-portrait"><FatimaPortrait/></div>
      <p className="vl-kicker">{say("YOUR PERSONAL SPACE", "مساحتك الشخصية")}</p><h2>Fátima</h2>
      <p>{profile.age} · {say("Founder · Barcelona", "مؤسسة شركة · برشلونة")}</p>
      <p>{profile.lifestyle[lang]}</p>
      <div className="vl-profile-details"><div><small>{say("My focus", "تركيزي")}</small><strong>{say("Energy, strength & balance", "الطاقة والقوة والتوازن")}</strong></div><div><small>{say("My routine", "روتيني")}</small><strong>{say("Strength 3× / week · daily walks", "قوة ٣ مرات أسبوعياً · مشي يومي")}</strong></div></div>
      <h3>{say("My goals", "أهدافي")}</h3><ul>{profile.goals.map(item => <li key={item.id}>✦ {item.title[lang]}</li>)}</ul>
      <h3>{say("Vitamins & supplements", "الفيتامينات والمكملات")}</h3><p className="vl-muted">{say("Her recorded routine. These are not personalised supplement recommendations.", "روتينها المسجل. هذه ليست توصيات شخصية بالمكملات.")}</p>
      {profile.vitamins.map(item => <div className="vl-detail-row" key={item.id}><strong>{item.name[lang]}</strong><small>{item.entry[lang]}</small></div>)}
      <p className="vl-muted">{say("Fictional profile and illustrated portrait for this demo.", "ملف وصورة توضيحية خياليان لهذا العرض.")}</p>
      <button className="vl-primary" onClick={() => setPanel("day")}>{say("Back to my day", "العودة إلى يومي")}</button>
    </section> : panel === "settings" ? <section className="vl-panel" data-testid="experience-settings">
      <p className="vl-kicker">{say("SETTINGS", "الإعدادات")}</p><h2>{say("Your connected apps", "تطبيقاتك المتصلة")}</h2>
      <p className="vl-muted">{say("Explore Fátima’s connected life. Every connection and reading on this screen is simulated. Switches change this demo only.", "استكشفي حياة فاطمة المتصلة. كل الاتصالات والقراءات هنا محاكاة. المفاتيح تغيّر العرض التجريبي فقط.")}</p>
      <div className="vl-app-list">{demoApps.map(app => <div className="vl-app-row" key={app.id}>
        <span className="vl-app-icon">{app.icon}</span><div><strong>{app.name}</strong><small>{ar ? app.ar : app.category}</small><span className={apps.includes(app.id) ? "vl-connected" : "vl-muted"}>{apps.includes(app.id) ? say("Connected · demo", "متصل · تجريبي") : say("Disconnected · demo", "غير متصل · تجريبي")}</span></div>
        <button type="button" role="switch" aria-checked={apps.includes(app.id)} aria-label={app.name + " demo connection"} className="vl-switch" onClick={() => toggleApp(app.id)}><span/></button>
      </div>)}</div>
      <p className="vl-muted">{say("Saved demo readings remain in the dashboard when a source is switched off. No live account is accessed.", "تبقى القراءات التجريبية المحفوظة في لوحة البيانات بعد إيقاف المصدر. لا يتم الوصول إلى حساب حقيقي.")}</p>
      <Link className="vl-text-link" href="/connections">{say("Connection information & available integrations", "معلومات الاتصالات والتكاملات المتاحة")}</Link>
      <button className="vl-primary" onClick={() => setPanel("day")}>{say("Back to my day", "العودة إلى يومي")}</button>
    </section> : <>
      {view === "overview" && <>
      <section className="vl-performance" data-testid="performance-dashboard" id="my-data">
        <div className="vl-section-heading"><div><p className="vl-kicker">{say("YOUR BODY, AT A GLANCE", "جسمك في لمحة")}</p><h2>{say("My wellbeing", "رفاهيتي")}</h2></div><span className="vl-sync-dot">{say("Demo data", "بيانات تجريبية")}</span></div>
        <div className="vl-periods" role="group" aria-label={say("Choose time period", "اختر الفترة")}>{(["today","week","month","year"] as DashboardPeriod[]).map(value => <button key={value} data-testid={"period-" + value} aria-pressed={period === value} onClick={() => setPeriod(value)}>{say(({today:"Today",week:"Week",month:"Month",year:"Year"})[value],({today:"اليوم",week:"الأسبوع",month:"الشهر",year:"السنة"})[value])}</button>)}</div>
        <p className="vl-period-caption" data-testid="period-summary">{period === "today" ? say("Today’s simulated connected-app readings", "قراءات التطبيقات المحاكاة لليوم") : say("Daily averages · " + selected.days.length + " days in this period", "متوسطات يومية · " + selected.days.length + " يوماً في الفترة")}</p>
        <div className="vl-rings">
          <MetricRing value={String(Math.round(selected.average("recovery"))) + "%"} label={say("Recovery", "التعافي")} detail="WHOOP" color={recoveryColor} progress={selected.average("recovery")} onOpen={() => setDetailMetric("recovery")}/>
          <MetricRing value={Math.floor(sleep/60) + "h " + sleep%60 + "m"} label={say("Sleep", "النوم")} detail="Circular Ring" color="#b7acf3" progress={sleep / 480 * 100} onOpen={() => setDetailMetric("sleepMinutes")}/>
          <MetricRing value={selected.average("strain").toFixed(1)} label={say("Activity load", "حمل النشاط")} detail="WHOOP · /21" color="#f6b47b" progress={selected.average("strain") / 21 * 100} onOpen={() => setDetailMetric("strain")}/>
        </div>
        <div className="vl-recovery-state" style={{color: recoveryColor}}>{recovery >= 67 ? say("GOOD RECOVERY", "تعافٍ جيد") : recovery >= 34 ? say("MODERATE RECOVERY", "تعافٍ متوسط") : say("LOW RECOVERY", "تعافٍ منخفض")}</div>
        <Sprout><strong>{say(period === "today" ? "Today’s insight" : "Period insight", period === "today" ? "رؤية اليوم" : "رؤية الفترة")}</strong><p>{say("Recovery is " + recovery + (period === "today" ? "%. Last night’s sleep: " : "%. Average sleep: ") + Math.floor(sleep/60) + "h " + sleep%60 + "m. Your previous seven-day recovery average is " + Math.round(baseline.average("recovery")) + "%. Check how you feel before choosing your next activity.", "التعافي " + recovery + (period === "today" ? "٪. نوم الليلة الماضية: " : "٪. متوسط النوم: ") + Math.floor(sleep/60) + " س " + sleep%60 + " د. متوسط التعافي للأيام الستة السابقة " + Math.round(baseline.average("recovery")) + "٪. لاحظي شعورك قبل نشاطك التالي.")}</p><button className="vl-text-link" onClick={() => setView("journal")}>{say("Check in with Vita →", "تحدثي إلى فيتا ←")}</button></Sprout>
        <h3 className="vl-monitor-title">{say("HEALTH MONITOR", "مراقبة المؤشرات")}</h3>
        <div className="vl-stats"><div><strong>{Math.round(selected.average("steps")).toLocaleString(ar?"ar":"en")}</strong><small>{say("Steps", "خطوات")}</small></div><div><strong>{Math.round(selected.average("hrv"))}<em> ms</em></strong><small>HRV</small></div><div><strong>{Math.round(selected.average("pulse"))}<em> bpm</em></strong><small>{say("Resting heart rate", "نبض الراحة")}</small></div></div>
        {period !== "today" && <div className="vl-trend"><div className="vl-trend-title"><span>{say("Recovery trend", "اتجاه التعافي")}</span><small>{say("Daily values · %", "القيم اليومية · ٪")}</small></div><div className="vl-trend-bars" role="img" aria-label={say("Recovery readings for the selected period", "قراءات التعافي للفترة المختارة")}>{selected.days.slice().reverse().filter((_, index) => index % Math.max(1, Math.floor(selected.days.length / 30)) === 0).map(day => <span key={day.date} style={{height:day.recovery + "%"}} title={day.date + ": " + day.recovery + "%"}/>)}</div><div className="vl-trend-title"><small>{selected.days[selected.days.length - 1]?.date}</small><small>{selected.days[0]?.date}</small></div></div>}
      </section>

      <div className="vl-two-cards">
        <section className="vl-panel"><p className="vl-kicker">CRONOMETER</p><h2>{say("Food that fuels you", "طعام يدعم طاقتك")}</h2><div className="vl-calories"><strong>{Math.round(selected.average("calories")).toLocaleString(ar?"ar":"en")}</strong><span>{say(period === "today" ? "kcal logged today" : "kcal / day average", period === "today" ? "سعرة مسجلة اليوم" : "متوسط سعرات يومياً")}</span></div>
          <div className="vl-macros">{(["protein","carbs","fat"] as const).map((key,index) => <div key={key}><span style={{background:["#a09cdb","#e4ab77","#86bba2"][index]}}/><strong>{Math.round(selected.average(key))}g</strong><small>{say(["Protein","Carbs","Fat"][index],["بروتين","كربوهيدرات","دهون"][index])}</small></div>)}</div>
          <p className="vl-muted">{say(period === "today" ? "Breakfast: oats & berries. Lunch: salmon, rice & greens. Afternoon: yogurt and almonds." : "Daily averages from Fátima’s simulated food diary.", period === "today" ? "فطور: شوفان وتوت. غداء: سلمون وأرز وخضروات. وجبة خفيفة: زبادي ولوز." : "متوسطات يومية من سجل الطعام التجريبي لفاطمة.")}</p>
        </section>
        <section className="vl-panel"><p className="vl-kicker">RENPHO HEALTH</p><h2>{say("Body check-in", "متابعة الجسم")}</h2><div className="vl-calories"><strong>{selected.average("weight").toFixed(1)}<em> kg</em></strong><span>{say(period === "today" ? "Morning weight · 07:15" : "Average morning weight", period === "today" ? "وزن الصباح · ٠٧:١٥" : "متوسط وزن الصباح")}</span></div><p className="vl-soft-note">{say(period === "today" ? "+0.3 kg from yesterday in this demo. A single reading doesn’t define your progress. How do you feel in your body today?" : "Look at the longer pattern alongside how you feel, your movement and your routine.", period === "today" ? "+٠٫٣ كغ عن أمس في التجربة. قراءة واحدة لا تحدد تقدمك. كيف تشعرين في جسمك اليوم؟" : "انظري إلى الاتجاه الطويل مع شعورك وحركتك وروتينك.")}</p></section>
      </div>

      <section className="vl-panel"><div className="vl-section-heading"><div><p className="vl-kicker">{say("MOVEMENT & ROUTINE", "الحركة والروتين")}</p><h2>{say("Small things, adding up", "أشياء صغيرة تُحدث فرقاً")}</h2></div><span className="vl-leaf">✦</span></div><div className="vl-routine-grid"><div><strong>{Math.round(selected.average("activeMinutes"))} min</strong><small>{say(period === "today" ? "Walk + mobility today" : "Average daily movement", period === "today" ? "مشي ومرونة اليوم" : "متوسط الحركة اليومي")}</small></div><div><strong>{say("Tomorrow · 18:00", "غداً · ١٨:٠٠")}</strong><small>{say("Strength session · 35 min", "تمارين قوة · ٣٥ دقيقة")}</small></div></div><div className="vl-detail-row"><strong>{say("My vitamins", "فيتاميناتي")}</strong><span>{say("D logged · B12 routine", "د مسجل · روتين ب١٢")}</span></div><button type="button" className="vl-text-link" onClick={() => setPanel("profile")}>{say("See my routine and goals", "عرض روتيني وأهدافي")}</button></section>

      <section className="vl-panel vl-work"><p className="vl-kicker">{say("CALENDAR + WORK", "التقويم والعمل")}</p><h2>{say("Make room for a pause", "اتركي مساحة لاستراحة")}</h2><div className="vl-calories"><strong>{Math.floor(selected.average("workMinutes")/60)}h {Math.round(selected.average("workMinutes")%60)}m</strong><span>{say(period === "today" ? "Work in today’s demo schedule" : "Average scheduled work / day", period === "today" ? "عمل في جدول اليوم التجريبي" : "متوسط العمل المجدول يومياً")}</span></div><p>{say(period === "today" ? "Today is 30 minutes over your 8-hour work goal. Could the next task wait? Protect a short break before continuing." : "Workload includes lighter weekend days. Leave space between meetings and use breaks when you need them.", period === "today" ? "اليوم أطول من هدفك بثماني ساعات بـ٣٠ دقيقة. هل يمكن أن تنتظر المهمة التالية؟ خذي استراحة قصيرة." : "يشمل المعدل عطلات أخف. اتركي مساحة بين الاجتماعات وخذي استراحات.")}</p><Link href="/focus" className="vl-primary">{say("Start a Pomodoro / break", "ابدئي مؤقت التركيز والاستراحة")}</Link></section>

      <section className="vl-panel vl-identity" data-testid="vital-id-card"><p className="vl-kicker">YOUR VITAL ID</p><h2>{say("Share on your terms", "شاركي بشروطك")}</h2><p className="vl-muted">{say("A selected health summary with an expiry you choose.", "ملخص صحي تختارين محتواه ومدة صلاحيته.")}</p><div className="vl-identity-status"><span>✓ {say("Demo profile", "ملف تجريبي")}</span><span>✓ {apps.length} {say("demo sources", "مصادر تجريبية")}</span><span>✓ {say("Consent active", "الموافقة نشطة")}</span></div><Link className="vl-primary" href="/share">{say("Choose details & share securely", "اختاري التفاصيل وشاركي بأمان")}</Link></section>
      </>}
      {view === "journal" && <>
      <section className="vl-feeling vl-panel" data-testid="feeling-box">
        <div className="vl-section-heading"><div><p className="vl-kicker">{say("FIRST, YOU", "أنتِ أولاً")}</p><h2>{say("How are you feeling?", "كيف تشعرين؟")}</h2></div><span className="vl-feeling-face" aria-hidden="true">{mood ? faces[mood - 1] : "🙂"}</span></div>
        <p className="vl-muted">{say("Your numbers tell part of the story. Tell me your part.", "الأرقام تحكي جزءاً من القصة. احكي لي الجزء الذي تشعرين به.")}</p>
        <div className="vl-moods" role="group" aria-label={say("How you feel", "شعورك")}>{faces.map((face, index) => <button type="button" key={face} aria-pressed={mood === index + 1} aria-label={say(["Low", "Tired", "Okay", "Good", "Great"][index], ["منخفض", "متعبة", "عادي", "جيد", "رائع"][index])} onClick={() => {setMood(index + 1 as Mood); setSaved(false);}}><span>{face}</span><small>{say(["Low", "Tired", "Okay", "Good", "Great"][index], ["منخفض", "متعبة", "عادي", "جيد", "رائع"][index])}</small></button>)}</div>
        <label className="vl-note-label"><span className="sr-only">{say("Tell me about your day", "احكي لي عن يومك")}</span><textarea value={note} onChange={event => {setNote(event.target.value); setSaved(false);}} placeholder={say("A good moment? Something on your mind? Write or speak…", "لحظة جميلة؟ شيء يشغل بالك؟ اكتبي أو تحدثي…")} rows={3} maxLength={3000}/></label>
        <div className="vl-feeling-actions"><VoiceDictation onFinal={text => {setNote(value => value ? value + " " + text : text); setSaved(false);}}/><button type="button" className="vl-primary" disabled={!mood && !note.trim()} onClick={saveFeeling}>{saved ? say("Saved ✓", "تم الحفظ ✓") : say("Tell Vita", "أخبري فيتا")}</button></div>
        {saved && <p className="vl-saved" role="status">{say("I’ve saved your check-in. Let’s make a little space for you below.", "حفظت حديثك. لنخصص لك مساحة صغيرة أدناه.")}</p>}
      </section>

      <section className="vl-panel"><p className="vl-kicker">{say("TODAY’S STORY", "قصة اليوم")}</p><h2>{say("More than numbers", "أكثر من أرقام")}</h2><ol className="vl-timeline">
        <li><time>08:10</time><div><strong>{say("A walk before the rush", "مشية قبل انشغال اليوم")}</strong><p>{say("26 minutes outside. A little space before your first call.", "٢٦ دقيقة في الخارج قبل أول مكالمة.")}</p><small>WHOOP · Circular</small></div></li>
        <li><time>11:30</time><div><strong>{say("Investor conversation", "حديث مع المستثمر")}</strong><p>{say("“I was nervous beforehand, but I explained the idea clearly. Send the updated deck tomorrow.”", "«كنت متوترة، لكنني شرحت الفكرة بوضوح. أرسل العرض المحدث غداً.»")}</p><small>PLAUD · {say("simulated voice note", "ملاحظة صوتية محاكاة")}</small></div></li>
        <li><time>15:45</time><div><strong>{say("A thought worth keeping", "فكرة تستحق الاحتفاظ بها")}</strong><p>{say("“I don’t need to finish everything today. One meaningful thing at a time.”", "«لست بحاجة لإنهاء كل شيء اليوم. شيء مهم واحد كل مرة.»")}</p><small>Stream by Sandbar · {say("demo note", "ملاحظة تجريبية")}</small></div></li>
      </ol></section>

      <section className="vl-care vl-panel" data-testid="care-space"><p className="vl-kicker">{say("A MOMENT FOR YOU", "لحظة لك")}</p><h2>{say("Let’s check in a little deeper.", "لنتحدث عن شعورك أكثر.")}</h2><Sprout celebrate={saved}><p>{saved ? carePrompt : say("What is one thing you wish someone had asked you today? You can start with the feeling box above, or just take a quiet moment here.", "ما السؤال الذي تمنيت أن يسألك أحد اليوم؟ ابدئي بصندوق الشعور أعلاه أو خذي لحظة هادئة هنا.")}</p></Sprout>
        <label className="vl-note-label"><span>{say("What’s on your mind?", "ما الذي يشغل بالك؟")}</span><textarea rows={3} value={reflection} maxLength={3000} onChange={event => {setReflection(event.target.value); setReflectionSaved(false);}} placeholder={say("There’s no right answer…", "لا توجد إجابة صحيحة أو خاطئة…")}/></label>
        <div className="vl-care-actions"><button type="button" className="vl-text-link" disabled={!voice.available || voice.muted} onClick={() => voice.speak(carePrompt, "guide")}>{say("Listen to Vita", "استمعي إلى فيتا")}</button><button type="button" className="vl-primary" disabled={!reflection.trim()} onClick={() => {setItem(CHECKIN_KEY,{date:localDateKey(),mood,note,reflection});setReflectionSaved(true);}}>{say("Save my reflection", "احفظي تأملي")}</button></div>
        {reflectionSaved && <p role="status" className="vl-saved">{say("Saved for you. What is one kind thing you can do for yourself tonight?", "محفوظ لك. ما الشيء اللطيف الذي يمكنك فعله لنفسك الليلة؟")}</p>}
        <button type="button" className={"vl-breathe" + (breathing ? " is-breathing" : "")} onClick={() => {setBreathSecond(0);setBreathing(value=>!value);}}><span className="vl-breathe-orb"/><span>{breathing ? (breathSecond % 8 < 4 ? say("Breathe in gently", "شهيق بهدوء") : say("Breathe out gently", "زفير بهدوء")) : say("Take a 24-second pause", "استراحة لمدة ٢٤ ثانية")}<small>{breathing ? say("Tap to stop", "اضغطي للإيقاف") : say("At your own pace", "بإيقاع يناسبك")}</small></span></button>
        <p className="vl-muted">{say("Guided reflection for this demo, not therapy or a clinical assessment.", "تأمل موجّه للعرض التجريبي، وليس علاجاً أو تقييماً سريرياً.")}</p>
      </section>

      </>}
      {view === "plan" && <>
      <section className="vl-panel vl-tomorrow" data-testid="tomorrow-plan"><p className="vl-kicker">{say("LET’S MAKE TOMORROW KINDER", "لنجعل الغد ألطف")}</p><h2>{say("What matters tomorrow?", "ما الذي يهم غداً؟")}</h2><p className="vl-muted">{tomorrow.toLocaleDateString(ar?"ar-AE":"en-GB",{weekday:"long",day:"numeric",month:"long"})} · {say("simulated calendar", "تقويم محاكاة")}</p>
        <div className="vl-agenda"><div><time>09:00</time><span>{say("Team check-in", "اجتماع الفريق")}<small>30 min</small></span></div><div><time>11:00</time><span>{say("Investor follow-up", "متابعة المستثمر")}<small>60 min · {say("updated deck", "العرض المحدث")}</small></span></div><div><time>14:00</time><span>{say("Product workshop", "ورشة المنتج")}<small>90 min</small></span></div><div><time>18:00</time><span>{say("Strength & stretch", "قوة وتمدد")}<small>35 min</small></span></div></div>
        <Sprout><p>{say("Your morning has two meetings. There’s a clear gap at 10:00 for the deck and at 12:00 for lunch. Which one thing would make tomorrow feel successful?", "لديك اجتماعين صباحاً. هناك وقت في العاشرة للعرض وفي الثانية عشرة للغداء. ما الشيء الواحد الذي سيجعل الغد ناجحاً بالنسبة لك؟")}</p></Sprout>
        <label className="vl-note-label"><span>{say("My one priority", "أولويتي الواحدة")}</span><input data-testid="tomorrow-goal" value={goal} maxLength={300} onChange={event=>{setGoal(event.target.value);setPlanSaved(false);}} placeholder={say("Send the deck, then switch off at 18:00", "أرسل العرض ثم أتوقف عن العمل في السادسة")}/></label>
        <p className="vl-kicker">{say("A SMALL PROMISE TO MYSELF", "وعد صغير لنفسي")}</p><div className="vl-goal-chips">{["walk","lunch","pause"].map(value=><button key={value} type="button" aria-pressed={gentleStep===value} onClick={()=>{setGentleStep(value);setPlanSaved(false);}}>{say(({walk:"10-minute walk",lunch:"A real lunch break",pause:"An earlier evening"})[value as "walk"|"lunch"|"pause"],({walk:"مشي ١٠ دقائق",lunch:"استراحة غداء",pause:"مساء أهدأ"})[value as "walk"|"lunch"|"pause"])}</button>)}</div>
        <button type="button" className="vl-primary" disabled={!goal.trim()} onClick={savePlan}>{planSaved ? say("Tomorrow’s plan saved ✓", "تم حفظ خطة الغد ✓") : say("Save my plan for tomorrow", "احفظي خطتي للغد")}</button>
        {planSaved && <p role="status" className="vl-saved">{say("Saved in your demo. Your real calendar has not been changed.", "محفوظ في التجربة. لم يتغير تقويمك الحقيقي.")}</p>}
      </section>

      </>}
      <footer className="vl-bottom-links"><Link href="/history">{say("My journal", "يومياتي")}</Link><Link href="/checkin" data-testid="dashboard-checkin">{say("Full daily check-in", "تسجيل يومي مفصل")}</Link><button onClick={()=>setPanel("settings")}>{say("Apps & settings", "التطبيقات والإعدادات")}</button></footer>
      <p className="vl-footer-note">{say("All values in this experience are fictional. The original Circular sample is available separately.", "كل القيم في هذه التجربة خيالية. عينة Circular الأصلية متاحة بشكل منفصل.")} <Link href="/signals">{say("View sample", "عرض العينة")}</Link></p>
    </>}
    {detailMetric && <div className="vl-modal-backdrop" onClick={() => setDetailMetric(null)}><section className="vl-panel vl-metric-detail" role="dialog" aria-modal="true" aria-label={say("Metric details", "تفاصيل المؤشر")} onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === "Escape") setDetailMetric(null); if (event.key === "Tab") event.preventDefault(); }}>
      <div className="vl-section-heading"><h2>{say(({recovery:"Recovery",sleepMinutes:"Sleep",strain:"Activity load"})[detailMetric],({recovery:"التعافي",sleepMinutes:"النوم",strain:"حمل النشاط"})[detailMetric])}</h2><button type="button" autoFocus className="vl-text-link" onClick={() => setDetailMetric(null)}>{say("Close", "إغلاق")}</button></div>
      <p className="vl-muted">{say("Fictional demo readings. The recovery score is a fixture, not a clinical calculation or a reproduced WHOOP algorithm.", "قراءات تجريبية خيالية. درجة التعافي مثال وليست حساباً سريرياً أو إعادة إنشاء لخوارزمية WHOOP.")}</p>
      <div className="vl-detail-row"><strong>{say("Selected period", "الفترة المختارة")}</strong><span>{selected.average(detailMetric).toFixed(1)} {detailMetric === "sleepMinutes" ? "min" : detailMetric === "recovery" ? "%" : "/21"}</span></div>
      <div className="vl-detail-row"><strong>{say("Previous seven days", "الأيام السبعة السابقة")}</strong><span>{baseline.average(detailMetric).toFixed(1)}</span></div>
      <div className="vl-detail-row"><strong>HRV</strong><span>{Math.round(selected.average("hrv"))} ms</span></div><div className="vl-detail-row"><strong>{say("Resting pulse", "نبض الراحة")}</strong><span>{Math.round(selected.average("pulse"))} bpm</span></div>
      <p className="vl-muted">{say("Compare patterns over time and your journal. One score is only part of the picture.", "قارني الاتجاهات عبر الوقت مع يومياتك. درجة واحدة ليست الصورة الكاملة.")}</p>
    </section></div>}
  </div>;
}
