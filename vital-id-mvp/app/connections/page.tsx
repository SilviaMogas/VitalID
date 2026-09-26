"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RequireConsent from "@/components/RequireConsent";
import { useLang } from "@/app/providers";
import { getItem, STORAGE_KEYS } from "@/lib/storage";
import type { DemoProfile } from "@/lib/demo";

type State = "loading" | "connected" | "available" | "setup" | "needs-app" | "manual" | "planned";

export default function ConnectionsPage() {
  const { lang } = useLang();
  const [plaud, setPlaud] = useState<State>("loading");
  const [whoop, setWhoop] = useState<State>("loading");
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    const isDemo = Boolean(getItem<DemoProfile>(STORAGE_KEYS.profile)?.isDemo);
    setDemo(isDemo);
    if (isDemo) return;
    fetch("/api/plaud/recordings").then(r => r.json()).then(d => setPlaud(d.configured ? "connected" : "setup")).catch(() => setPlaud("available"));
    fetch("/api/whoop/signals", { cache: "no-store" }).then(r => r.json()).then(d => setWhoop(d.connected ? "connected" : d.configured ? "available" : "setup")).catch(() => setWhoop("available"));
  }, []);

  const label = (state: State) => {
    if (state === "loading") return lang === "ar" ? "جارٍ التحقق…" : "Checking…";
    if (state === "connected") return lang === "ar" ? "متصل" : "Connected";
    if (state === "setup") return lang === "ar" ? "يحتاج إعداد المطور" : "Needs developer setup";
    if (state === "needs-app") return lang === "ar" ? "يحتاج تطبيق iPhone" : "Needs iPhone app";
    if (state === "manual") return lang === "ar" ? "إدخال يدوي" : "Manual entry";
    if (state === "planned") return lang === "ar" ? "غير متصل بعد" : "Not connected yet";
    return lang === "ar" ? "متاح عند الإعداد" : "Available when configured";
  };

  const sources = [
    { id: "plaud", icon: "🎙️", name: "PLAUD", state: plaud, text: lang === "ar" ? "استورد ملاحظاتك الصوتية وحوّلها إلى نص." : "Import your voice notes and turn them into text.", href: plaud === "connected" ? "/checkin" : undefined },
    { id: "whoop", icon: "⌚", name: "WHOOP", state: whoop, text: lang === "ar" ? "النوم والتعافي والنبض وHRV عبر OAuth." : "Sleep, recovery, resting heart rate and HRV through OAuth.", href: whoop === "connected" ? "/signals" : whoop === "available" ? "/api/whoop/connect" : undefined },
    { id: "apple", icon: "♥️", name: "Apple Health", state: "needs-app" as State, text: lang === "ar" ? "لا يستطيع موقع الويب قراءة HealthKit مباشرة. يحتاج Vital ID إلى تطبيق iPhone أو استيراد ملف بموافقتك." : "A website cannot read HealthKit directly. Vital ID needs an iPhone app or a consented file import." },
    { id: "food", icon: "🥗", name: lang === "ar" ? "الطعام والترطيب" : "Food & hydration", state: "manual" as State, text: lang === "ar" ? "سجّل الوجبات والماء الآن. Cronometer وMyFitnessPal خياران للتتبع، لكن لا يوجد استيراد مباشر بعد." : "Log meals and water now. Cronometer and MyFitnessPal are tracking options; direct import is not available yet.", href: "/checkin" },
    { id: "renpho", icon: "⚖️", name: "RENPHO Health", state: "planned" as State, text: lang === "ar" ? "يحتفظ التطبيق بقياسات الميزان الذكي. لا يستورد Vital ID هذه القراءات تلقائياً بعد." : "The app keeps smart-scale measurements. Vital ID does not import these readings automatically yet." },
    { id: "movement", icon: "🏃", name: lang === "ar" ? "الحركة والتمارين" : "Movement & exercise", state: "manual" as State, text: lang === "ar" ? "المشي واليوغا والجيم والعلاج الطبيعي في نفس اليوميات." : "Walking, yoga, gym and physio in the same daily story.", href: "/checkin" },
  ];

  const discoverSources = [
    { id: "oura", icon: "◉", name: "Oura Ring", category: lang === "ar" ? "النوم والتعافي" : "Sleep & readiness", text: lang === "ar" ? "مؤشرات النوم والجاهزية والنشاط من خاتم Oura. لا توجد قراءة من حساب فاطمة." : "Sleep, readiness and activity from an Oura ring. No reading from Fátima’s account.", url: "https://ouraring.com/" },
    { id: "sandbar", icon: "🎙️", name: "Stream by Sandbar", category: lang === "ar" ? "ملاحظات صوتية" : "Voice notes", text: lang === "ar" ? "خاتم لتسجيل الأفكار الصوتية، وليس لقياس النوم أو نبض القلب." : "A ring for capturing spoken thoughts, not sleep or heart-rate measurements.", url: "https://shop.sandbar.com/" },
    { id: "lumia", icon: "✦", name: "Lumia Health", category: lang === "ar" ? "جهاز قابل للارتداء" : "Wearable", text: lang === "ar" ? "جهاز يُلبس في الأذن لعرض اتجاهات تدفق الدم لأغراض الرفاهية، وليس للتشخيص." : "An ear-worn wellness device for blood-flow trends, not a diagnosis.", url: "https://lumiahealth.com/" },
    { id: "flamaid", icon: "◆", name: "FlamAid", category: lang === "ar" ? "السلامة الشخصية" : "Personal safety", text: lang === "ar" ? "تطبيق وجهاز لإرسال تنبيه وموقعك إلى جهات الاتصال عند الخطر. Vital ID لا يفعّل إنذار الطوارئ." : "A device and app for safety alerts to trusted contacts. Vital ID does not trigger its emergency alarm.", url: "https://www.flamaid.com/" },
  ];

  return (
    <RequireConsent>
      <div className="pt-6 flex flex-col gap-5">
        <div>
          <p className="eyebrow">{lang === "ar" ? "الإعدادات والتطبيقات" : "Settings & connected apps"}</p>
          <h1 className="text-3xl font-bold">{lang === "ar" ? "تطبيقاتك ومصادر بياناتك" : "Your apps and data sources"}</h1>
          <p style={{ color: "var(--muted)" }}>{lang === "ar" ? "لا نطلب كلمة مرور Apple ID. كل مصدر يحتاج موافقة منفصلة ويمكن فصله." : "We never ask for your Apple ID password. Every source needs separate consent and can be disconnected."}</p>
        </div>
        <Link href="/dashboard" className="underline text-sm">{lang === "ar" ? "العودة إلى لوحة البيانات" : "Back to dashboard"}</Link>
        {demo && <section className="flex flex-col gap-3" data-testid="demo-connections">
          <div><p className="eyebrow">{lang === "ar" ? "ملف فاطمة" : "Fátima’s profile"}</p><h2 className="text-xl font-bold">{lang === "ar" ? "تطبيقاتها المتصلة" : "Connected apps"}</h2><p className="text-sm" style={{ color: "var(--muted)" }}>{lang === "ar" ? "هذه التطبيقات أمثلة في ملف فاطمة. تُعرض بياناتها في لوحة البيانات." : "These are Fátima’s example apps. Her data appears on the dashboard."}</p></div>
          <ul className="source-grid">
            <li className="card source-card"><div className="source-icon" aria-hidden="true">◉</div><div><h3 className="font-bold">Circular Ring <span className="badge badge-neutral">{lang === "ar" ? "عينة" : "Sample"}</span></h3><p style={{ color: "var(--muted)" }}>{lang === "ar" ? "النوم والخطوات والنبض وHRV من بيانات Circular المقدمة." : "Sleep, steps, pulse and HRV from the supplied Circular snapshot."}</p></div><Link href="/signals" className="btn btn-outline w-full">{lang === "ar" ? "عرض البيانات" : "View signals"}</Link></li>
            <li className="card source-card"><div className="source-icon" aria-hidden="true">🎙️</div><div><h3 className="font-bold">PLAUD <span className="badge badge-neutral">{lang === "ar" ? "عرض" : "Preview"}</span></h3><p style={{ color: "var(--muted)" }}>{lang === "ar" ? "مثال لملاحظاتها الصوتية. ربط حساب PLAUD الحقيقي يُدار هنا عند توفر ربط لكل مستخدم." : "Example voice notes. A real PLAUD account must be connected here when per-user linking is available."}</p></div></li>
            <li className="card source-card"><div className="source-icon" aria-hidden="true">⌚</div><div><h3 className="font-bold">WHOOP <span className="badge badge-neutral">{lang === "ar" ? "عرض" : "Preview"}</span></h3><p style={{ color: "var(--muted)" }}>{lang === "ar" ? "النوم والتعافي والنشاط في يومياتها." : "Sleep, recovery and activity alongside her diary."}</p></div></li>
            <li className="card source-card" data-testid="demo-cronometer"><div className="source-icon" aria-hidden="true">🥗</div><div><h3 className="font-bold">Cronometer <span className="badge badge-neutral">{lang === "ar" ? "عرض" : "Preview"}</span></h3><p style={{ color: "var(--muted)" }}>{lang === "ar" ? "يوميات الطعام والماء والفيتامينات. مثال: برتقالة مع فطور الأمس." : "Food, water and vitamin diary. Example: yesterday’s breakfast included an orange."}</p></div></li>
            <li className="card source-card" data-testid="demo-renpho"><div className="source-icon" aria-hidden="true">⚖️</div><div><h3 className="font-bold">RENPHO Health <span className="badge badge-neutral">{lang === "ar" ? "عرض" : "Preview"}</span></h3><p style={{ color: "var(--muted)" }}>{lang === "ar" ? "وزن الصباح من ميزانها الذكي: تغير نموذجي +0.3 كغ عن أمس." : "Morning smart-scale entry: an example +0.3 kg change from yesterday."}</p></div></li>
          </ul>
          <p className="text-xs" style={{ color: "var(--muted)" }}>{lang === "ar" ? "وضع تجريبي: هذه المصادر معروضة كمثال. لا توجد اتصالات حية بحسابات فاطمة." : "Demo mode: these sources are examples. Fátima’s accounts are not connected live."}</p>
        </section>}
        {!demo && <ul className="source-grid">
          {sources.map(source => (
            <li key={source.id} className="card source-card" data-testid={`source-${source.id}`}>
              <div className="source-icon" aria-hidden="true">{source.icon}</div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{source.name}</h2><span className={`badge ${source.state === "connected" ? "badge-live" : "badge-neutral"}`}>{label(source.state)}</span></div>
                <p style={{ color: "var(--muted)" }}>{source.text}</p>
              </div>
              {source.href && <Link href={source.href} className="btn btn-outline w-full">{source.state === "connected" ? (lang === "ar" ? "فتح" : "Open") : (lang === "ar" ? "إعداد أو فتح" : "Set up or open")}</Link>}
            </li>
          ))}
        </ul>}
        <section className="flex flex-col gap-3" data-testid="discover-sources">
          <div>
            <p className="eyebrow">{lang === "ar" ? "مصادر أخرى" : "More sources"}</p>
            <h2 className="text-xl font-bold">{lang === "ar" ? "استكشفي تطبيقات وأجهزة أخرى" : "Explore more apps & devices"}</h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>{lang === "ar" ? "WHOOP مدرج أعلاه. الخيارات التالية غير متصلة بـ Vital ID حالياً." : "WHOOP is listed above. The options below are not connected to Vital ID yet."}</p>
          </div>
          <ul className="source-grid">
            {discoverSources.map(source => (
              <li key={source.id} className="card source-card" data-testid={`discover-${source.id}`}>
                <div className="source-icon" aria-hidden="true">{source.icon}</div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{source.name}</h3><span className="badge badge-neutral">{lang === "ar" ? "غير متصل" : "Not connected"}</span></div>
                  <p className="text-xs font-semibold" style={{ color: "var(--accent)" }}>{source.category}</p>
                  <p style={{ color: "var(--muted)" }}>{source.text}</p>
                </div>
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline text-sm">{lang === "ar" ? "الموقع الرسمي" : "Official site"}</a>
              </li>
            ))}
          </ul>
        </section>
        <p className="text-sm" style={{ color: "var(--muted)" }}>{lang === "ar" ? "لا توجد شراكة أو رعاية ضمنية مع هذه العلامات. الاتصالات الحية تعتمد على إعداد المطور وموافقة المستخدم." : "No partnership or sponsorship is implied. Live connections depend on developer configuration and user consent."}</p>
        <Link href="/membership" className="btn btn-outline w-full">{lang === "ar" ? "العضوية والفوترة" : "Membership & billing"}</Link>
        <Link href="/dashboard" className="btn btn-primary w-full">{lang === "ar" ? "افتح لوحة البيانات" : "Open dashboard"}</Link>
      </div>
    </RequireConsent>
  );
}
