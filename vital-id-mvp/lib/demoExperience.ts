import { localDateKey } from "./daily";
import type { DashboardPeriod } from "./dashboard";

export interface DemoDay {
  date: string; sleepMinutes: number; recovery: number; strain: number;
  steps: number; hrv: number; pulse: number; weight: number;
  calories: number; protein: number; carbs: number; fat: number;
  workMinutes: number; activeMinutes: number;
}

// Entirely fictional connected-app scenario. Never used for personal accounts
// or derived from the supplied Circular HAR.
export function demoDays(now = new Date()): DemoDay[] {
  return Array.from({ length: 365 }, (_, index) => {
    const day = new Date(now); day.setHours(12, 0, 0, 0); day.setDate(day.getDate() - index);
    const protein = index === 0 ? 96 : 85 + (index * 7 % 35);
    const carbs = index === 0 ? 195 : 180 + (index * 11 % 55);
    const fat = index === 0 ? 64 : 55 + (index * 3 % 20);
    return {
      date: localDateKey(day),
      sleepMinutes: index === 0 ? 382 : 390 + (index * 17 % 95),
      recovery: index === 0 ? 68 : 60 + (index * 13 % 34),
      strain: index === 0 ? 10.4 : Math.round((7 + (index * 7 % 65) / 10) * 10) / 10,
      steps: index === 0 ? 6842 : 4800 + (index * 331 % 5700),
      hrv: index === 0 ? 58 : 53 + (index * 3 % 24),
      pulse: index === 0 ? 61 : 55 + (index * 2 % 10),
      weight: index === 0 ? 64.3 : index === 1 ? 64 : Math.round((64 + Math.sin(index / 9) * .5) * 10) / 10,
      calories: protein * 4 + carbs * 4 + fat * 9,
      protein, carbs, fat,
      workMinutes: index === 0 ? 510 : index % 7 > 4 ? 30 : 390 + (index * 13 % 140),
      activeMinutes: index === 0 ? 38 : 20 + (index * 7 % 45),
    };
  });
}

export function demoPeriod(days: DemoDay[], period: DashboardPeriod, now = new Date()) {
  const today = localDateKey(now);
  const selected = days.filter(day => day.date <= today && (
    period === "today" ? day.date === today :
    period === "week" ? day.date >= localDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)) :
    period === "month" ? day.date.slice(0, 7) === today.slice(0, 7) :
    day.date.slice(0, 4) === today.slice(0, 4)
  ));
  const average = (key: keyof Omit<DemoDay, "date">) => selected.length ? selected.reduce((total, day) => total + day[key], 0) / selected.length : 0;
  return { days: selected, average };
}

export const demoApps = [
  { id: "circular", name: "Circular Ring", icon: "◉", category: "Sleep & heart", ar: "النوم والقلب" },
  { id: "whoop", name: "WHOOP", icon: "⌁", category: "Recovery & activity", ar: "التعافي والنشاط" },
  { id: "oura", name: "Oura Ring", icon: "○", category: "Readiness", ar: "الجاهزية" },
  { id: "renpho", name: "RENPHO Health", icon: "⚖", category: "Body measurements", ar: "قياسات الجسم" },
  { id: "cronometer", name: "Cronometer", icon: "◒", category: "Meals & macros", ar: "الوجبات والمغذيات" },
  { id: "plaud", name: "PLAUD", icon: "▥", category: "Voice notes", ar: "ملاحظات صوتية" },
  { id: "calendar", name: "Calendar", icon: "▦", category: "Work & tomorrow", ar: "العمل والغد" },
  { id: "sandbar", name: "Stream by Sandbar", icon: "◎", category: "Thoughts on the go", ar: "أفكارك أثناء التنقل" },
  { id: "lumia", name: "Lumia", icon: "✦", category: "Wellbeing", ar: "الرفاهية" },
  { id: "flamaid", name: "FlamAid", icon: "◇", category: "Personal safety", ar: "السلامة الشخصية" },
] as const;
