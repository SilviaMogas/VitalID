import type { Cycle, Recovery, Sleep, WhoopDaily, Workout } from './types';

/**
 * Pure WHOOP → daily-metrics mapping (client-safe, no server imports).
 *
 * Days are grouped by the *local* calendar date derived from each record's
 * `timezone_offset` ("+08:00"). A sleep belongs to the local day it ended
 * (the wake-up morning); cycles, recoveries (via their cycle) and workouts
 * to the local day they started.
 */

/** "+08:00" / "-05:30" → minutes east of UTC. */
function offsetMinutes(tz: string | undefined): number {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(tz ?? '');
  if (!m) return 0;
  const v = Number(m[2]) * 60 + Number(m[3]);
  return m[1] === '-' ? -v : v;
}

function localDay(iso: string | undefined, tz: string | undefined): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return new Date(ms + offsetMinutes(tz) * 60_000).toISOString().slice(0, 10);
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * WHOOP's own documented scales. A malformed or corrupted API response
 * (wrong units, a bad sensor reading) is nulled out here rather than shown —
 * a metric silently missing is safer than a garbage number on the dashboard.
 */
function clamp(value: number | null | undefined, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value >= min && value <= max ? value : null;
}

function emptyDay(date: string): WhoopDaily {
  return {
    date,
    recoveryScore: null,
    hrvMs: null,
    restingHr: null,
    sleepHours: null,
    sleepPerformance: null,
    strain: null,
    avgHeartRate: null,
    workoutMinutes: null,
    workoutCount: null,
  };
}

export function mapWhoopToDaily(input: {
  recoveries: Recovery[];
  cycles: Cycle[];
  sleeps: Sleep[];
  workouts: Workout[];
}): WhoopDaily[] {
  const days = new Map<string, WhoopDaily>();
  const day = (date: string) => {
    const existing = days.get(date);
    if (existing) return existing;
    const created = emptyDay(date);
    days.set(date, created);
    return created;
  };

  const cycleDayById = new Map<number, string>();
  for (const c of input.cycles) {
    const date = localDay(c.start, c.timezone_offset);
    if (!date) continue;
    cycleDayById.set(c.id, date);
    if (c.score_state !== 'SCORED' || !c.score) continue;
    const d = day(date);
    d.strain = clamp(c.score.strain, 0, 21);
    d.avgHeartRate = clamp(c.score.average_heart_rate, 25, 220);
  }

  for (const r of input.recoveries) {
    if (r.score_state !== 'SCORED' || !r.score) continue;
    const date = cycleDayById.get(r.cycle_id) ?? localDay(r.created_at, undefined);
    if (!date) continue;
    const d = day(date);
    d.recoveryScore = clamp(r.score.recovery_score, 0, 100);
    d.hrvMs = clamp(r.score.hrv_rmssd_milli, 1, 300);
    d.restingHr = clamp(r.score.resting_heart_rate, 25, 220);
  }

  for (const s of input.sleeps) {
    if (s.nap === true) continue;
    if (s.score_state !== 'SCORED' || !s.score) continue;
    const date = localDay(s.end, s.timezone_offset);
    if (!date) continue;
    const st = s.score.stage_summary;
    const d = day(date);
    d.sleepHours = clamp(
      round2((st.total_in_bed_time_milli - st.total_awake_time_milli - st.total_no_data_time_milli) / 3.6e6),
      0,
      24,
    );
    d.sleepPerformance = clamp(s.score.sleep_performance_percentage ?? null, 0, 100);
  }

  for (const w of input.workouts) {
    const date = localDay(w.start, w.timezone_offset);
    if (!date || !w.end) continue;
    const minutes = (new Date(w.end).getTime() - new Date(w.start).getTime()) / 60_000;
    // A single workout longer than 24h points at a corrupted start/end pair, not real activity.
    if (!(minutes > 0) || minutes > 1440) continue;
    const d = day(date);
    d.workoutMinutes = (d.workoutMinutes ?? 0) + round2(minutes);
    d.workoutCount = (d.workoutCount ?? 0) + 1;
  }

  // A scored cycle with no workouts is a zero-activity day, not a missing one.
  for (const d of days.values()) {
    if (d.strain !== null && d.workoutMinutes === null) {
      d.workoutMinutes = 0;
      d.workoutCount = 0;
    }
  }

  return [...days.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}
