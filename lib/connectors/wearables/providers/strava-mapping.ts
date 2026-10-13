import { emptyDay, round1, sortDays } from '../normalize';
import type { WearableDaily } from '../types';

/** Strava activities → daily totals (pure). Days use `start_date_local`. */

export interface StravaActivity {
  start_date_local: string; // "2026-10-01T07:30:00Z" (local wall-clock labelled Z)
  moving_time?: number; // seconds
  distance?: number; // meters
  average_heartrate?: number;
  calories?: number;
}

export function mapStravaToDaily(activities: StravaActivity[]): WearableDaily[] {
  const days = new Map<string, WearableDaily>();
  const hr = new Map<string, { sum: number; weight: number }>();
  for (const a of activities) {
    const date = typeof a.start_date_local === 'string' ? a.start_date_local.slice(0, 10) : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const moving = typeof a.moving_time === 'number' && a.moving_time > 0 ? a.moving_time : 0;
    if (moving === 0 || moving > 86_400) continue; // corrupted duration
    const d = days.get(date) ?? emptyDay(date);
    days.set(date, d);
    d.workoutCount = (d.workoutCount ?? 0) + 1;
    d.activeMinutes = round1((d.activeMinutes ?? 0) + moving / 60);
    if (typeof a.distance === 'number') d.distanceM = (d.distanceM ?? 0) + a.distance;
    if (typeof a.calories === 'number') d.calories = (d.calories ?? 0) + a.calories;
    if (typeof a.average_heartrate === 'number') {
      const h = hr.get(date) ?? { sum: 0, weight: 0 };
      h.sum += a.average_heartrate * moving;
      h.weight += moving;
      hr.set(date, h);
    }
  }
  for (const [date, h] of hr) days.get(date)!.avgHeartRate = round1(h.sum / h.weight);
  return sortDays(days);
}
