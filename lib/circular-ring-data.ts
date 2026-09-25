/**
 * Daily signals exported from a Circular Ring account (api.circular.care/measures),
 * 2026-09-01 → 2026-09-24. Dates are the local calendar day (UTC+8) of each daily bucket.
 *
 * Mapping from Circular metrics:
 *  recovery ← user.daily.energy.score × 100
 *  sleep    ← user.daily.real.sleep.duration / 60 (hours)
 *  hrv      ← user.daily.asleep.hrv (ms)
 *  activity ← user.daily.active.minute (min)
 * Resting heart rate is not part of the export, so it is not included here.
 */
export const CIRCULAR_RING_DAILY = [
  { date: "2026-09-01", recovery: 93, sleep: 8.0, hrv: 64, activity: 336 },
  { date: "2026-09-02", recovery: 92, sleep: 8.6, hrv: 60, activity: 355 },
  { date: "2026-09-03", recovery: 95, sleep: 5.4, hrv: 67, activity: 593 },
  { date: "2026-09-04", recovery: 82, sleep: 7.2, hrv: 52, activity: 423 },
  { date: "2026-09-05", recovery: 91, sleep: 8.9, hrv: 58, activity: 530 },
  { date: "2026-09-06", recovery: 90, sleep: 9.2, hrv: 52, activity: 476 },
  { date: "2026-09-07", recovery: 77, sleep: 5.9, hrv: 45, activity: 448 },
  { date: "2026-09-08", recovery: 69, sleep: 5.4, hrv: 42, activity: 568 },
  { date: "2026-09-09", recovery: 59, sleep: 3.0, hrv: 31, activity: 694 },
  { date: "2026-09-10", recovery: 91, sleep: 8.7, hrv: 57, activity: 430 },
  { date: "2026-09-11", recovery: 93, sleep: 6.6, hrv: 67, activity: 428 },
  { date: "2026-09-12", recovery: 84, sleep: 8.4, hrv: 54, activity: 278 },
  { date: "2026-09-13", recovery: 90, sleep: 9.7, hrv: 61, activity: 330 },
  { date: "2026-09-14", recovery: 95, sleep: 9.8, hrv: 67, activity: 88 },
  { date: "2026-09-15", recovery: 81, sleep: 9.2, hrv: 64, activity: 281 },
  { date: "2026-09-16", recovery: 96, sleep: 12.1, hrv: 63, activity: 386 },
  { date: "2026-09-17", recovery: 97, sleep: 7.8, hrv: 68, activity: 279 },
  { date: "2026-09-18", recovery: 95, sleep: 8.2, hrv: 81, activity: 470 },
  { date: "2026-09-19", recovery: 80, sleep: 6.7, hrv: 43, activity: 700 },
  { date: "2026-09-20", recovery: 51, sleep: 8.4, hrv: 23, activity: 366 },
  { date: "2026-09-21", recovery: 95, sleep: 10.6, hrv: 85, activity: 348 },
  { date: "2026-09-22", recovery: 96, sleep: 8.5, hrv: 86, activity: 336 },
  { date: "2026-09-23", recovery: 92, sleep: 9.9, hrv: 60, activity: 343 },
  { date: "2026-09-24", recovery: 96, sleep: 7.3, hrv: 70, activity: 142 },
] as const;
