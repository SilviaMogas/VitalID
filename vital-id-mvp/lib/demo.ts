import type { Lang } from "./i18n";
import { localDateKey, type DailyEntry, type Energy, type Mood } from "./daily";

export interface DemoProfile {
  id: string;
  name: string;
  isDemo: true;
  joinedAt: number;
  age: number;
  connectedApps: Array<"circular" | "plaud" | "whoop" | "cronometer" | "renpho">;
  lifestyle: Record<Lang, string>;
  vitamins: Array<{ id: "d" | "b12" | "c"; name: Record<Lang, string>; entry: Record<Lang, string> }>;
  goals: Array<{ id: "sleep" | "movement" | "balance"; title: Record<Lang, string>; detail: Record<Lang, string> }>;
}

export interface LocalMembership {
  plan: "free" | "plus" | "circle";
  status: "demo" | "active";
}

const DAYS: Array<{ mood: Mood; energy: Energy; movement: [string, string]; minutes: number; food: [string, string]; note: [string, string] }> = [
  { mood: 4, energy: "steady", movement: ["مشي صباحي", "Morning walk"], minutes: 32, food: ["فطور متوازن وماء كافٍ", "Balanced breakfast and enough water"], note: ["راجعت عرض المستثمر، ومشيت، وتناولت العشاء وكأس نبيذ مع صديقة. عدت إلى المنزل متأخرة.", "Reviewed the investor deck, went for a walk and had dinner and a glass of wine with a friend. Got home late."] },
  { mood: 5, energy: "high", movement: ["تمارين قوة", "Strength training"], minutes: 40, food: ["سلطة ودجاج وفاكهة", "Salad, chicken and fruit"], note: ["كان التدريب رائعاً وأنهيت التحضير للاجتماع.", "Training felt great and I finished preparing for the meeting."] },
  { mood: 3, energy: "low", movement: ["تمدد خفيف", "Light stretching"], minutes: 15, food: ["قهوة أكثر من المعتاد وماء قليل", "More coffee than usual and not much water"], note: ["نمت أقل بسبب العمل المتأخر. أحتاج إلى وتيرة أهدأ.", "Slept less after working late. I need a gentler pace."] },
  { mood: 4, energy: "steady", movement: ["يوغا", "Yoga"], minutes: 25, food: ["شوربة وخضروات وماء", "Soup, vegetables and water"], note: ["تحدثت مع الفريق وكانت الأولويات أوضح.", "Spoke with the team and the priorities felt clearer."] },
  { mood: 4, energy: "high", movement: ["جري خفيف", "Easy run"], minutes: 28, food: ["شوفان وسمك وأرز", "Oats, fish and rice"], note: ["طاقة جيدة. تدربت على أسئلة المستثمر.", "Good energy. Practised the investor questions."] },
  { mood: 3, energy: "steady", movement: ["مشي بعد الغداء", "Walk after lunch"], minutes: 22, food: ["غداء متأخر وماء كافٍ", "Late lunch and enough water"], note: ["يوم مزدحم، لكن أخذت استراحة قصيرة ساعدتني.", "Busy day, but a short break helped."] },
  { mood: 4, energy: "steady", movement: ["تمارين مرونة", "Mobility routine"], minutes: 20, food: ["بيض وخضروات وفاكهة", "Eggs, vegetables and fruit"], note: ["بدأت الأسبوع بهدوء وكتبت أهدافي.", "Started the week calmly and wrote down my goals."] },
];

export function createFatimaProfile(now = Date.now()): DemoProfile {
  return {
    id: "demo-fatima", name: "Fatima", isDemo: true, joinedAt: now, age: 42,
    connectedApps: ["circular", "plaud", "whoop", "cronometer", "renpho"],
    lifestyle: {
      en: "Founder with full meeting days. She walks most afternoons and enjoys dinners with friends.",
      ar: "مؤسسة شركة وأيامها مليئة بالاجتماعات. تمشي معظم الأمسيات وتحب العشاء مع الصديقات.",
    },
    vitamins: [
      { id: "d", name: { en: "Vitamin D", ar: "فيتامين د" }, entry: { en: "Supplement logged this morning", ar: "سُجّل مكمّل هذا الصباح" } },
      { id: "b12", name: { en: "Vitamin B12", ar: "فيتامين ب١٢" }, entry: { en: "Part of her weekly routine", ar: "جزء من روتينها الأسبوعي" } },
      { id: "c", name: { en: "Vitamin C", ar: "فيتامين ج" }, entry: { en: "Orange with breakfast yesterday", ar: "برتقالة مع فطور الأمس" } },
    ],
    goals: [
      { id: "sleep", title: { en: "More consistent sleep", ar: "نوم أكثر انتظاماً" }, detail: { en: "Make space for calmer evenings", ar: "وقت لأمسيات أكثر هدوءاً" } },
      { id: "movement", title: { en: "Keep movement enjoyable", ar: "الاستمتاع بالحركة" }, detail: { en: "Walk or stretch when it feels good", ar: "المشي أو التمدد حين يناسبها" } },
      { id: "balance", title: { en: "Feel steadier on meeting days", ar: "توازن أكبر في أيام الاجتماعات" }, detail: { en: "Notice stress and take short pauses", ar: "ملاحظة التوتر وأخذ استراحات قصيرة" } },
    ],
  };
}

export function createFatimaHistory(lang: Lang, now = new Date()): DailyEntry[] {
  const olderNotes = {
    en: ["A steady day of work and a short walk.", "Made time for meals and a quiet evening.", "A busy day; a brief pause helped.", "Worked through priorities and checked in with a friend."],
    ar: ["يوم عمل هادئ ومشية قصيرة.", "خصصت وقتاً للطعام وأمسية هادئة.", "يوم مزدحم؛ ساعدتني استراحة قصيرة.", "رتبت الأولويات وتواصلت مع صديقة."],
  };
  const history: DailyEntry[] = [];
  for (let index = 0; index < 365; index += 1) {
    if (index >= 7 && (index % 7 === 0 || index % 11 === 0)) continue;
    const day = DAYS[index % DAYS.length];
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (index + 1));
    history.push({
      id: "demo-fatima-" + localDateKey(date),
      date: localDateKey(date),
      createdAt: date.getTime(),
      mood: index < 7 ? day.mood : ([3, 4, 4, 5, 3, 4, 5] as Mood[])[index % 7],
      energy: day.energy,
      note: index < 7 ? day.note[lang === "ar" ? 0 : 1] : olderNotes[lang][index % olderNotes[lang].length],
      movement: day.movement[lang === "ar" ? 0 : 1],
      movementMinutes: index < 7 ? day.minutes : Math.max(10, day.minutes + ((index * 7) % 13) - 6),
      food: day.food[lang === "ar" ? 0 : 1],
      source: "sample",
      demo: true,
    });
  }
  return history;
}
