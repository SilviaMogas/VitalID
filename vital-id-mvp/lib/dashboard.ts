import { localDateKey, type DailyEntry } from "./daily";

export type DashboardPeriod = "today" | "week" | "month" | "year";

export interface MoodBucket {
  label: string;
  average: number | null;
  count: number;
}

export function entriesForPeriod(entries: DailyEntry[], period: DashboardPeriod, now = new Date()): DailyEntry[] {
  const today = localDateKey(now);
  const weekStart = new Date(now);
  weekStart.setHours(12, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const firstWeekDay = localDateKey(weekStart);
  const month = today.slice(0, 7);
  const year = today.slice(0, 4);
  return entries.filter(entry => {
    if (period === "today") return entry.date === today;
    if (period === "week") return entry.date >= firstWeekDay && entry.date <= today;
    if (period === "month") return entry.date.startsWith(month);
    return entry.date.startsWith(year);
  }).sort((a, b) => b.date.localeCompare(a.date));
}

export function summarizeDashboard(entries: DailyEntry[]) {
  const moods = entries.flatMap(entry => entry.mood === null ? [] : [entry.mood]);
  const movementMinutes = entries.reduce((sum, entry) => sum + (entry.movementMinutes ?? 0), 0);
  return {
    daysLogged: entries.length,
    averageMood: moods.length ? moods.reduce((sum, mood) => sum + mood, 0) / moods.length : null,
    movementMinutes,
    activeDays: entries.filter(entry => (entry.movementMinutes ?? 0) > 0).length,
    latestFood: entries.find(entry => entry.food.trim())?.food ?? null,
    latestNote: entries.find(entry => entry.note.trim())?.note ?? null,
  };
}

function moodAverage(entries: DailyEntry[]): number | null {
  const moods = entries.flatMap(entry => entry.mood === null ? [] : [entry.mood]);
  return moods.length ? moods.reduce((sum, mood) => sum + mood, 0) / moods.length : null;
}

export function moodBuckets(entries: DailyEntry[], period: DashboardPeriod, now = new Date(), lang: "en" | "ar" = "en"): MoodBucket[] {
  if (period === "today") {
    return [{ label: lang === "ar" ? "اليوم" : "Today", average: moodAverage(entries), count: entries.length }];
  }
  if (period === "week") {
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(now);
      day.setHours(12, 0, 0, 0);
      day.setDate(day.getDate() - (6 - index));
      const key = localDateKey(day);
      const matching = entries.filter(entry => entry.date === key);
      return { label: day.toLocaleDateString(lang === "ar" ? "ar-AE" : "en-GB", { weekday: "short" }), average: moodAverage(matching), count: matching.length };
    });
  }
  if (period === "month") {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Array.from({ length: Math.ceil(daysInMonth / 7) }, (_, index) => {
      const first = index * 7 + 1;
      const last = Math.min(daysInMonth, first + 6);
      const matching = entries.filter(entry => {
        const day = Number(entry.date.slice(8, 10));
        return day >= first && day <= last;
      });
      return { label: String(first) + "–" + String(last), average: moodAverage(matching), count: matching.length };
    });
  }
  return Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, "0");
    const matching = entries.filter(entry => entry.date.slice(5, 7) === month);
    const date = new Date(now.getFullYear(), index, 1);
    return { label: date.toLocaleDateString(lang === "ar" ? "ar-AE" : "en-GB", { month: "short" }), average: moodAverage(matching), count: matching.length };
  });
}
