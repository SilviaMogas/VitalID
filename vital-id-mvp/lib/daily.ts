import type { Lang } from "./i18n";
import type { StoredSignals } from "@/data/syntheticSignals";

export type Mood = 1 | 2 | 3 | 4 | 5;
export type Energy = "low" | "steady" | "high";

export interface DailyEntry {
  id: string;
  date: string;
  createdAt: number;
  mood: Mood | null;
  energy: Energy | null;
  note: string;
  movement: string;
  movementMinutes: number | null;
  food: string;
  source: "manual" | "voice" | "plaud" | "sample";
  demo?: boolean;
}

export interface DailyRecap {
  title: string;
  lines: string[];
  watch: string | null;
  disclaimer: string;
}

export function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  return `${y}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function upsertDaily(entries: DailyEntry[], entry: DailyEntry): DailyEntry[] {
  return [entry, ...entries.filter((item) => item.date !== entry.date)].sort((a, b) => b.createdAt - a.createdAt);
}

const moodLabel = {
  ar: ["", "صعب جداً", "صعب", "عادي", "جيد", "جيد جداً"],
  en: ["", "very difficult", "difficult", "okay", "good", "very good"],
};

export function buildDailyRecap(entry: DailyEntry, lang: Lang, signals?: StoredSignals | null): DailyRecap {
  const lines: string[] = [];
  if (entry.mood) lines.push(lang === "ar" ? `الشعور اليوم: ${moodLabel.ar[entry.mood]}.` : `Today feels ${moodLabel.en[entry.mood]}.`);
  if (entry.energy) {
    const energy = lang === "ar"
      ? ({ low: "منخفضة", steady: "مستقرة", high: "مرتفعة" } as const)[entry.energy]
      : entry.energy;
    lines.push(lang === "ar" ? `الطاقة: ${energy}.` : `Energy: ${energy}.`);
  }
  if (entry.note.trim()) lines.push(lang === "ar" ? `بكلماتك: ${entry.note.trim()}` : `In your words: ${entry.note.trim()}`);
  if (entry.movement.trim() || entry.movementMinutes) {
    const activity = entry.movement.trim() || (lang === "ar" ? "حركة" : "movement");
    const minutes = entry.movementMinutes ? (lang === "ar" ? ` لمدة ${entry.movementMinutes} دقيقة` : ` for ${entry.movementMinutes} minutes`) : "";
    lines.push(lang === "ar" ? `الحركة: ${activity}${minutes}.` : `Movement: ${activity}${minutes}.`);
  }
  if (entry.food.trim()) lines.push(lang === "ar" ? `الطعام والترطيب: ${entry.food.trim()}` : `Food and hydration: ${entry.food.trim()}`);
  if (signals) {
    lines.push(signals.source === "whoop"
      ? (lang === "ar" ? "تمت إضافة إشارات WHOOP إلى الصورة اليومية." : "WHOOP signals are included in today's picture.")
      : (lang === "ar" ? "إشارات الجهاز المعروضة تجريبية." : "Displayed wearable signals are sample data."));
  }
  const watch = entry.mood && entry.mood <= 2
    ? (lang === "ar"
      ? "يبدو أن اليوم صعب. قد يفيد التواصل مع شخص تثق به. إذا كنت في خطر أو تحتاج مساعدة عاجلة، اتصل بخدمات الطوارئ المحلية."
      : "Today sounds difficult. Consider reaching out to someone you trust. If you are in danger or need urgent help, contact local emergency services.")
    : null;
  return {
    title: lang === "ar" ? "ملخص يومك" : "Your day at a glance",
    lines,
    watch,
    disclaimer: lang === "ar"
      ? "هذا ملخص وصفي، وليس تشخيصاً أو نصيحة طبية."
      : "This is a descriptive wellness recap, not a diagnosis or medical advice.",
  };
}
