/** Client-safe wearable types (no server imports). */

export type OAuthWearableId = 'oura' | 'strava';
export type PushWearableId = 'apple_health' | 'health_connect';
export type WearableId = OAuthWearableId | PushWearableId;

export const OAUTH_WEARABLES: OAuthWearableId[] = ['oura', 'strava'];
export const PUSH_WEARABLES: PushWearableId[] = ['apple_health', 'health_connect'];

export function isOAuthWearable(v: unknown): v is OAuthWearableId {
  return typeof v === 'string' && (OAUTH_WEARABLES as string[]).includes(v);
}
export function isPushWearable(v: unknown): v is PushWearableId {
  return typeof v === 'string' && (PUSH_WEARABLES as string[]).includes(v);
}

/** Normalised day, local calendar date (YYYY-MM-DD). Every metric is optional. */
export interface WearableDaily {
  date: string;
  sleepHours: number | null;
  sleepScore: number | null;
  readinessScore: number | null;
  hrvMs: number | null;
  restingHr: number | null;
  steps: number | null;
  activeMinutes: number | null;
  calories: number | null;
  distanceM: number | null;
  workoutCount: number | null;
  avgHeartRate: number | null;
}

export interface WearableConnectionPublic {
  provider: OAuthWearableId;
  configured: boolean;
  connected: boolean;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  needsReauth: boolean;
}
