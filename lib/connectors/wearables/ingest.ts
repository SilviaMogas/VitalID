import { isRealDate, sanitizeDay, emptyDay } from './normalize';
import { isPushWearable, type PushWearableId, type WearableDaily } from './types';

/**
 * Validation of payloads pushed by a companion app (Apple HealthKit and
 * Health Connect have no cloud API — the phone app reads and uploads).
 * Pure; the route does auth, consent and size limits.
 */

export const MAX_INGEST_DAYS = 120;

export interface ParsedIngest {
  source: PushWearableId;
  days: WearableDaily[];
}

const FIELDS: (keyof WearableDaily)[] = [
  'sleepHours', 'sleepScore', 'readinessScore', 'hrvMs', 'restingHr',
  'steps', 'activeMinutes', 'calories', 'distanceM', 'workoutCount', 'avgHeartRate',
];

export function parseIngestPayload(body: unknown): ParsedIngest | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'invalid_body' };
  const { source, days } = body as { source?: unknown; days?: unknown };
  if (!isPushWearable(source)) return { error: 'invalid_source' };
  if (!Array.isArray(days) || days.length === 0) return { error: 'invalid_days' };
  if (days.length > MAX_INGEST_DAYS) return { error: 'too_many_days' };

  const today = new Date().toISOString().slice(0, 10);
  const byDate = new Map<string, WearableDaily>();
  for (const raw of days) {
    if (!raw || typeof raw !== 'object') return { error: 'invalid_day' };
    const r = raw as Record<string, unknown>;
    if (!isRealDate(r.date)) return { error: 'invalid_date' };
    // Allow one day of timezone skew, never the future beyond that.
    const limit = new Date(Date.parse(`${today}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    if (r.date > limit) return { error: 'invalid_date' };
    const day = emptyDay(r.date);
    for (const f of FIELDS) {
      const v = r[f];
      (day as unknown as Record<string, unknown>)[f] = typeof v === 'number' ? v : null;
    }
    byDate.set(r.date, sanitizeDay(day));
  }
  return { source, days: [...byDate.values()] };
}
