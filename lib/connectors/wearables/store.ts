import 'server-only';
import crypto from 'crypto';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { WearableDaily, WearableId } from './types';

/**
 * Connections, daily rows and ingest tokens. Supabase when configured,
 * in-memory otherwise (same selection as the WHOOP store).
 * `WearableConnection` carries live tokens: never return it from routes.
 */

export interface WearableConnection {
  userKey: string;
  provider: WearableId;
  externalUserId: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
  scope: string | null;
  connectedAt: string;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
}

export interface WearableStore {
  get(userKey: string, provider: WearableId): Promise<WearableConnection | null>;
  upsert(conn: WearableConnection): Promise<void>;
  updateTokens(userKey: string, provider: WearableId, t: { accessToken: string; refreshToken: string | null; expiresAt: string }): Promise<void>;
  markSync(userKey: string, provider: WearableId, patch: { lastSyncedAt?: string; lastSyncError?: string | null }): Promise<void>;
  delete(userKey: string, provider: WearableId): Promise<void>;
  saveDaily(userKey: string, provider: WearableId, rows: WearableDaily[]): Promise<void>;
  getDaily(userKey: string, provider: WearableId): Promise<WearableDaily[]>;
  /** Replaces the user's ingest token; stores the hash only. */
  setIngestTokenHash(userKey: string, hash: string): Promise<void>;
  findUserByIngestTokenHash(hash: string): Promise<string | null>;
}

export const hashToken = (t: string) => crypto.createHash('sha256').update(t).digest('hex');
const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

class MemoryWearableStore implements WearableStore {
  private conns = new Map<string, WearableConnection>();
  private daily = new Map<string, Map<string, WearableDaily>>();
  private tokens = new Map<string, string>(); // hash -> userKey
  private k = (u: string, p: string) => `${u}|${p}`;

  async get(u: string, p: WearableId) { return this.conns.get(this.k(u, p)) ?? null; }
  async upsert(c: WearableConnection) { this.conns.set(this.k(c.userKey, c.provider), c); }
  async updateTokens(u: string, p: WearableId, t: { accessToken: string; refreshToken: string | null; expiresAt: string }) {
    const c = this.conns.get(this.k(u, p));
    if (c) this.conns.set(this.k(u, p), { ...c, ...t, lastSyncError: c.lastSyncError === 'refresh_failed' ? null : c.lastSyncError });
  }
  async markSync(u: string, p: WearableId, patch: { lastSyncedAt?: string; lastSyncError?: string | null }) {
    const c = this.conns.get(this.k(u, p));
    if (!c) return;
    this.conns.set(this.k(u, p), {
      ...c,
      lastSyncedAt: patch.lastSyncedAt ?? c.lastSyncedAt,
      lastSyncError: patch.lastSyncError !== undefined ? patch.lastSyncError : c.lastSyncError,
    });
  }
  async delete(u: string, p: WearableId) { this.conns.delete(this.k(u, p)); this.daily.delete(this.k(u, p)); }
  async saveDaily(u: string, p: WearableId, rows: WearableDaily[]) {
    const m = this.daily.get(this.k(u, p)) ?? new Map<string, WearableDaily>();
    for (const r of rows) m.set(r.date, r);
    this.daily.set(this.k(u, p), m);
  }
  async getDaily(u: string, p: WearableId) {
    return [...(this.daily.get(this.k(u, p))?.values() ?? [])].sort((a, b) => (a.date < b.date ? -1 : 1));
  }
  async setIngestTokenHash(u: string, hash: string) {
    for (const [h, user] of this.tokens) if (user === u) this.tokens.delete(h);
    this.tokens.set(hash, u);
  }
  async findUserByIngestTokenHash(hash: string) { return this.tokens.get(hash) ?? null; }
}

interface ConnRow {
  user_key: string; provider: string; external_user_id: string | null; access_token: string;
  refresh_token: string | null; expires_at: string; scope: string | null; connected_at: string;
  last_synced_at: string | null; last_sync_error: string | null;
}
interface DailyRow {
  date: string; sleep_hours: unknown; sleep_score: unknown; readiness_score: unknown; hrv_ms: unknown;
  resting_hr: unknown; steps: unknown; active_minutes: unknown; calories: unknown; distance_m: unknown;
  workout_count: unknown; avg_heart_rate: unknown;
}

class SupabaseWearableStore implements WearableStore {
  private sb = () => getSupabaseServerClient();

  async get(u: string, p: WearableId) {
    const { data, error } = await this.sb().from('vital_id_wearable_connections').select('*')
      .eq('user_key', u).eq('provider', p).maybeSingle();
    if (error) throw new Error(`wearable get failed: ${error.message}`);
    if (!data) return null;
    const r = data as ConnRow;
    return {
      userKey: r.user_key, provider: r.provider as WearableId, externalUserId: r.external_user_id,
      accessToken: r.access_token, refreshToken: r.refresh_token, expiresAt: r.expires_at, scope: r.scope,
      connectedAt: r.connected_at, lastSyncedAt: r.last_synced_at, lastSyncError: r.last_sync_error,
    };
  }
  async upsert(c: WearableConnection) {
    const { error } = await this.sb().from('vital_id_wearable_connections').upsert({
      user_key: c.userKey, provider: c.provider, external_user_id: c.externalUserId,
      access_token: c.accessToken, refresh_token: c.refreshToken, expires_at: c.expiresAt, scope: c.scope,
      connected_at: c.connectedAt, last_synced_at: c.lastSyncedAt, last_sync_error: c.lastSyncError,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_key,provider' });
    if (error) throw new Error(`wearable upsert failed: ${error.message}`);
  }
  async updateTokens(u: string, p: WearableId, t: { accessToken: string; refreshToken: string | null; expiresAt: string }) {
    const { error } = await this.sb().from('vital_id_wearable_connections').update({
      access_token: t.accessToken, refresh_token: t.refreshToken, expires_at: t.expiresAt,
      last_sync_error: null, updated_at: new Date().toISOString(),
    }).eq('user_key', u).eq('provider', p);
    if (error) throw new Error(`wearable token update failed: ${error.message}`);
  }
  async markSync(u: string, p: WearableId, patch: { lastSyncedAt?: string; lastSyncError?: string | null }) {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.lastSyncedAt !== undefined) row.last_synced_at = patch.lastSyncedAt;
    if (patch.lastSyncError !== undefined) row.last_sync_error = patch.lastSyncError;
    const { error } = await this.sb().from('vital_id_wearable_connections').update(row).eq('user_key', u).eq('provider', p);
    if (error) throw new Error(`wearable markSync failed: ${error.message}`);
  }
  async delete(u: string, p: WearableId) {
    const [a, b] = await Promise.all([
      this.sb().from('vital_id_wearable_connections').delete().eq('user_key', u).eq('provider', p),
      this.sb().from('vital_id_wearable_daily').delete().eq('user_key', u).eq('provider', p),
    ]);
    if (a.error || b.error) throw new Error(`wearable delete failed: ${(a.error ?? b.error)?.message}`);
  }
  async saveDaily(u: string, p: WearableId, rows: WearableDaily[]) {
    if (rows.length === 0) return;
    const now = new Date().toISOString();
    const { error } = await this.sb().from('vital_id_wearable_daily').upsert(rows.map((r) => ({
      user_key: u, provider: p, date: r.date, sleep_hours: r.sleepHours, sleep_score: r.sleepScore,
      readiness_score: r.readinessScore, hrv_ms: r.hrvMs, resting_hr: r.restingHr, steps: r.steps,
      active_minutes: r.activeMinutes, calories: r.calories, distance_m: r.distanceM,
      workout_count: r.workoutCount, avg_heart_rate: r.avgHeartRate, updated_at: now,
    })), { onConflict: 'user_key,provider,date' });
    if (error) throw new Error(`wearable saveDaily failed: ${error.message}`);
  }
  async getDaily(u: string, p: WearableId) {
    const { data, error } = await this.sb().from('vital_id_wearable_daily').select('*')
      .eq('user_key', u).eq('provider', p).order('date', { ascending: true });
    if (error) throw new Error(`wearable getDaily failed: ${error.message}`);
    return (data as DailyRow[]).map((r) => ({
      date: r.date, sleepHours: num(r.sleep_hours), sleepScore: num(r.sleep_score),
      readinessScore: num(r.readiness_score), hrvMs: num(r.hrv_ms), restingHr: num(r.resting_hr),
      steps: num(r.steps), activeMinutes: num(r.active_minutes), calories: num(r.calories),
      distanceM: num(r.distance_m), workoutCount: num(r.workout_count), avgHeartRate: num(r.avg_heart_rate),
    }));
  }
  async setIngestTokenHash(u: string, hash: string) {
    const { error } = await this.sb().from('vital_id_wearable_ingest_tokens')
      .upsert({ user_key: u, token_hash: hash, created_at: new Date().toISOString(), last_used_at: null }, { onConflict: 'user_key' });
    if (error) throw new Error(`ingest token save failed: ${error.message}`);
  }
  async findUserByIngestTokenHash(hash: string) {
    const { data, error } = await this.sb().from('vital_id_wearable_ingest_tokens').select('user_key')
      .eq('token_hash', hash).maybeSingle();
    if (error) throw new Error(`ingest token lookup failed: ${error.message}`);
    return data ? (data as { user_key: string }).user_key : null;
  }
}

interface G { __vitalIdWearableStore?: { backend: string; store: WearableStore } }
export function getWearableStore(): WearableStore {
  const g = globalThis as G;
  const backend = isSupabaseConfigured() ? 'supabase' : 'memory';
  if (g.__vitalIdWearableStore?.backend === backend) return g.__vitalIdWearableStore.store;
  const store = backend === 'supabase' ? new SupabaseWearableStore() : new MemoryWearableStore();
  g.__vitalIdWearableStore = { backend, store };
  return store;
}
