import type { WearableDaily } from './types';

/**
 * Pure helpers shared by provider mappers and the ingest endpoint
 * (client-safe, no server imports). Out-of-range values become null — a
 * missing metric is safer than a garbage number on the dashboard.
 */

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function clamp(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value >= min && value <= max ? value : null;
}

export const round1 = (v: number) => Math.round(v * 10) / 10;
export const round2 = (v: number) => Math.round(v * 100) / 100;

export function isRealDate(s: unknown): s is string {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function emptyDay(date: string): WearableDaily {
  return {
    date,
    sleepHours: null,
    sleepScore: null,
    readinessScore: null,
    hrvMs: null,
    restingHr: null,
    steps: null,
    activeMinutes: null,
    calories: null,
    distanceM: null,
    workoutCount: null,
    avgHeartRate: null,
  };
}

/** Plausible ranges applied to every provider and to pushed data. */
export function sanitizeDay(d: WearableDaily): WearableDaily {
  return {
    date: d.date,
    sleepHours: clamp(d.sleepHours, 0, 24),
    sleepScore: clamp(d.sleepScore, 0, 100),
    readinessScore: clamp(d.readinessScore, 0, 100),
    hrvMs: clamp(d.hrvMs, 1, 300),
    restingHr: clamp(d.restingHr, 25, 220),
    steps: clamp(d.steps, 0, 200_000),
    activeMinutes: clamp(d.activeMinutes, 0, 1440),
    calories: clamp(d.calories, 0, 20_000),
    distanceM: clamp(d.distanceM, 0, 500_000),
    workoutCount: clamp(d.workoutCount, 0, 50),
    avgHeartRate: clamp(d.avgHeartRate, 25, 220),
  };
}

export function sortDays(map: Map<string, WearableDaily>): WearableDaily[] {
  return [...map.values()].map(sanitizeDay).sort((a, b) => (a.date < b.date ? -1 : 1));
}
