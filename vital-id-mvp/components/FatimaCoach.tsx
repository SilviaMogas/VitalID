"use client";

import { useState } from "react";
import { useLang } from "@/app/providers";
import { useVoice } from "./VoiceProvider";
import type { Mood } from "@/lib/daily";
import type { DemoProfile } from "@/lib/demo";

const moments = {
  en: [
    { icon: "☾", title: "A softer start", value: "80/100", label: "Last night · Circular sample", text: "Your sleep score was 80, compared with 93 the previous day. You mentioned dinner and a glass of wine with a friend. How was the evening? A score alone can’t tell us what changed.", question: "How did you feel when you woke up?" },
    { icon: "♡", title: "That meeting moment", value: "11:20", label: "Today · example pulse peak", text: "There’s a brief pulse peak around your investor meeting. Were you walking in, feeling excited, or was something on your mind?", question: "How did the meeting with the investor go?" },
    { icon: "↗", title: "More than a number", value: "+0.3 kg", label: "Today · RENPHO example", text: "The example RENPHO scale reading is a little higher today. It doesn’t define your day. You also logged a walk and regular meals yesterday — those moments deserve recognition too.", question: "How do you feel about that number?" },
    { icon: "🥗", title: "Food that fits your day", value: "🍊", label: "Yesterday · Cronometer example", text: "Yesterday’s food log includes a balanced breakfast, enough water and an orange. How did eating feel around your meetings?", question: "Was there a meal you enjoyed?" },
    { icon: "⏱", title: "A longer workday", value: "9h 20m", label: "Yesterday · example work hours", text: "You spent longer working yesterday than the eight-hour limit in your plan. You still made time for a walk. How are your energy and focus today?", question: "Would a short break help you now?" },
  ],
  ar: [
    { icon: "☾", title: "بداية ألطف", value: "80/100", label: "الليلة الماضية · عينة Circular", text: "كانت جودة نومك 80 مقابل 93 في اليوم السابق. ذكرتِ العشاء وكأس نبيذ مع صديقة. كيف كانت الأمسية؟ لا تكشف النتيجة وحدها سبب التغيير.", question: "كيف شعرتِ عندما استيقظتِ؟" },
    { icon: "♡", title: "لحظة الاجتماع", value: "11:20", label: "اليوم · مثال لارتفاع النبض", text: "تظهر زيادة قصيرة في النبض قرب اجتماع المستثمر. هل كنتِ تمشين، أم متحمسة، أم كان هناك ما يشغلك؟", question: "كيف كان اجتماعك مع المستثمر؟" },
    { icon: "↗", title: "أكثر من مجرد رقم", value: "+0.3 كغ", label: "اليوم · مثال RENPHO", text: "تظهر قراءة RENPHO النموذجية ارتفاعاً طفيفاً اليوم. هذا الرقم لا يحدد يومك. سجلتِ أيضاً مشياً ووجبات منتظمة بالأمس، وهذه خطوات تستحق التقدير.", question: "كيف تشعرين تجاه هذا الرقم؟" },
    { icon: "🥗", title: "طعام يناسب يومك", value: "🍊", label: "الأمس · مثال Cronometer", text: "يتضمن سجل طعام الأمس فطوراً متوازناً وماءً كافياً وبرتقالة. كيف كان شعورك مع الطعام بين الاجتماعات؟", question: "هل كانت هناك وجبة استمتعتِ بها؟" },
    { icon: "⏱", title: "يوم عمل أطول", value: "٩ س ٢٠ د", label: "الأمس · ساعات عمل نموذجية", text: "عملتِ بالأمس أكثر من حد الثماني ساعات في خطتك. ومع ذلك، خصصتِ وقتاً للمشي. كيف هي طاقتك وتركيزك اليوم؟", question: "هل تساعدك استراحة قصيرة الآن؟" },
  ],
};
const replies = {
  en: ["", "Thank you for telling me. You don’t have to make today productive. What would help you feel supported right now?", "Let’s make room for that feeling. Would you like to talk about it, or keep today gentle?", "An ordinary day counts too. Is there one thing you would like a little more space for?", "I’m glad to hear that. What has felt good today? Let’s notice it.", "That’s lovely, Fátima. What made today feel good? Let’s remember this moment."],
  ar: ["", "شكراً لأنك أخبرتني. ليس عليك أن تنجزي الكثير اليوم. ما الذي يجعلك تشعرين بالدعم الآن؟", "لنفسح مساحة لهذا الشعور. هل تريدين الحديث عنه أم تفضّلين يوماً هادئاً؟", "اليوم العادي له قيمته أيضاً. ما الذي تودين تخصيص وقت له؟", "يسعدني سماع ذلك. ما الذي كان جميلاً اليوم؟", "جميل يا فاطمة. ما الذي جعل يومك جيداً؟ لنحتفظ بهذه اللحظة."],
};

export default function FatimaCoach({ mood, onNote, profile }: { mood: Mood | null; onNote: (note: string) => void; profile: DemoProfile }) {
  const { lang } = useLang();
  const voice = useVoice();
  const [topic, setTopic] = useState(0);
  const [answer, setAnswer] = useState("");
  const [saved, setSaved] = useState(false);
  const moment = moments[lang][topic];
  const ar = lang === "ar";
  const goal = profile.goals?.[0]?.title[lang] ?? (ar ? "نوم أكثر انتظاماً" : "more consistent sleep");
  const greeting = ar ? `مرحباً فاطمة، كيف حالك؟ كيف كان يومك حتى الآن؟ أتذكر أن هدفك هو ${goal}. قبل الأرقام، أريد أن أعرف كيف تشعرين.` : `Hello Fátima, how are you? How has your day been so far? I remember your goal of ${goal?.toLowerCase()}. Before we look at the numbers, I’d love to know how you feel.`;
  return <section className="fatima-coach" data-testid="fatima-coach">
    <div className="coach-letter">
      <p className="eyebrow">{ar ? "رسالة صغيرة لك" : "A little note, just for you"}</p>
      <p className="coach-greeting">{greeting}</p>
      <button className="coach-listen" disabled={!voice.available || voice.muted} onClick={() => voice.speaking === "fatima-note" ? voice.stop() : voice.speak(greeting + " " + moment.text + " " + moment.question, "fatima-note")}>
        {voice.speaking === "fatima-note" ? (ar ? "إيقاف" : "Stop listening") : (ar ? "استمعي إلى رسالتك" : "Listen to your note")}
      </button>
      {voice.failed && <p role="status">{ar ? "الصوت غير متاح. رسالتك مكتوبة هنا." : "Audio is unavailable. Your full note is here to read."}</p>}
    </div>
    <div className="coach-topics" role="group" aria-label={ar ? "لحظات يومك" : "Moments from your day"}>
      {moments[lang].map((item, index) => <button key={index} aria-pressed={topic === index} onClick={() => { voice.stop(); setTopic(index); setSaved(false); }}>
        <span aria-hidden="true">{item.icon}</span><strong>{item.value}</strong><small>{item.title}</small>
      </button>)}
    </div>
    <article className="coach-moment" data-testid="coach-moment">
      <p className="eyebrow">{moment.label}</p>
      <h2 className="text-xl font-bold">{moment.title}</h2>
      <p>{moment.text}</p>
      <p className="font-bold">{moment.question}</p>
    </article>
    <p className="coach-response" role="status">{mood ? replies[lang][mood] : (ar ? "اختاري شعورك أدناه، أو أخبريني بكلماتك. أنا أستمع." : "Choose a feeling below, or tell me in your own words. I’m listening.")}</p>
    <label className="coach-answer">
      <span>{ar ? "ما الذي تريدين أن أعرفه؟" : "What would you like me to know?"}</span>
      <textarea rows={3} value={answer} onChange={e => {setAnswer(e.target.value); setSaved(false);}} placeholder={ar ? "لا تحتاجين إلى إجابة مثالية…" : "There’s no perfect answer…"} />
    </label>
    <button className="btn btn-outline" disabled={!answer.trim() || saved} onClick={() => {onNote(answer.trim()); setSaved(true);}}>
      {ar ? "أضيفي إلى ملاحظة اليوم" : "Add to today’s note"}
    </button>
    {saved && <p role="status">{ar ? "شكراً يا فاطمة. أضفت كلماتك إلى الملاحظة أدناه. يمكنك تعديلها قبل الحفظ." : "Thank you, Fátima. I’ve added your words to the note below. You can edit them before saving your check-in."}</p>}
  </section>;
}
