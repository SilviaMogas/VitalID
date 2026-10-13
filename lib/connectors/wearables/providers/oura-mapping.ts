import { emptyDay, round1, round2, sortDays } from '../normalize';
import type { WearableDaily } from '../types';

/**
 * Oura API v2 → normalised daily metrics (pure). Field names follow Oura's
 * public v2 docs (cloud.ouraring.com/v2/docs) — verify against the live API.
 */

export interface OuraDailySleep { day: string; score?: number | null }
export interface OuraDailyReadiness { day: string; score?: number | null }
export interface OuraDailyActivity {
  day: string;
  steps?: number | null;
  active_calories?: number | null;
  high_activity_time?: number | null; // seconds
  medium_activity_time?: number | null;
  equivalent_walking_distance?: number | null; // meters
}
export interface OuraSleepPeriod {
  day: string;
  type?: string; // long_sleep | late_nap | rest | sleep | deleted
  total_sleep_duration?: number | null; // seconds
  average_hrv?: number | null;
  lowest_heart_rate?: number | null;
}
export interface OuraWorkout { day: string }

export function mapOuraToDaily(input: {
  dailySleep: OuraDailySleep[];
  readiness: OuraDailyReadiness[];
  activity: OuraDailyActivity[];
  sleep: OuraSleepPeriod[];
  workouts: OuraWorkout[];
}): WearableDaily[] {
  const days = new Map<string, WearableDaily>();
  const day = (d: string) => {
    if (!days.has(d)) days.set(d, emptyDay(d));
    return days.get(d)!;
  };

  for (const s of input.dailySleep) if (s.day) day(s.day).sleepScore = s.score ?? null;
  for (const r of input.readiness) if (r.day) day(r.day).readinessScore = r.score ?? null;

  for (const a of input.activity) {
    if (!a.day) continue;
    const d = day(a.day);
    d.steps = a.steps ?? null;
    d.calories = a.active_calories ?? null;
    d.distanceM = a.equivalent_walking_distance ?? null;
    if (a.high_activity_time != null || a.medium_activity_time != null) {
      d.activeMinutes = round1(((a.high_activity_time ?? 0) + (a.medium_activity_time ?? 0)) / 60);
    }
  }

  // Main sleep only (long_sleep); naps and deleted periods are ignored.
  // If several long sleeps share a day, keep the longest.
  const best = new Map<string, OuraSleepPeriod>();
  for (const p of input.sleep) {
    if (!p.day || p.type !== 'long_sleep' || typeof p.total_sleep_duration !== 'number') continue;
    const cur = best.get(p.day);
    if (!cur || p.total_sleep_duration > (cur.total_sleep_duration ?? 0)) best.set(p.day, p);
  }
  for (const [date, p] of best) {
    const d = day(date);
    d.sleepHours = round2((p.total_sleep_duration as number) / 3600);
    d.hrvMs = p.average_hrv ?? null;
    d.restingHr = p.lowest_heart_rate ?? null;
  }

  for (const w of input.workouts) {
    if (!w.day) continue;
    const d = day(w.day);
    d.workoutCount = (d.workoutCount ?? 0) + 1;
  }
  return sortDays(days);
}
