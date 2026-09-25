import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { SharePayload, ShareRecipient } from './sharing';
import { isShareActive } from './sharing';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import * as supabaseStore from './share-store-supabase';

/**
 * Share store with three backends, in priority order:
 * - If SUPABASE_URL + SUPABASE_SECRET_KEY are set (and SHARE_STORE != 'memory'),
 *   shares are persisted in the `vital_id_shares` table (see share-store-supabase.ts).
 * - If UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, shares are
 *   persisted via Upstash Redis REST (SET with EX = seconds until expiry + 60,
 *   GET, DEL), with an index set `vitalid:shares`.
 * - Otherwise an in-memory Map on globalThis is used, PLUS a best-effort JSON
 *   file mirror at SHARE_STORE_FILE (default: <tmpdir>/vitalid-shares.json) so
 *   shares survive a dev-server restart. All file I/O is wrapped in try/catch.
 */

const INDEX_KEY = 'vitalid:shares';
const KEY_PREFIX = 'vitalid:share:';
const STORE_FILE = process.env.SHARE_STORE_FILE ?? path.join(os.tmpdir(), 'vitalid-shares.json');

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const useSupabase = process.env.SHARE_STORE?.toLowerCase() !== 'memory' && isSupabaseConfigured();
const useRedis = !useSupabase && Boolean(REDIS_URL && REDIS_TOKEN);

/** Active backend name, e.g. for health/debug endpoints. */
export const SHARE_BACKEND: 'supabase' | 'redis' | 'memory' = useSupabase
  ? 'supabase'
  : useRedis
    ? 'redis'
    : 'memory';

interface MemoryGlobal {
  __vitalidShares?: Map<string, SharePayload>;
}
const g = globalThis as MemoryGlobal;

function memoryMap(): Map<string, SharePayload> {
  if (!g.__vitalidShares) {
    g.__vitalidShares = new Map();
    // Cold start: best-effort restore from the JSON file mirror.
    try {
      const raw = fs.readFileSync(STORE_FILE, 'utf8');
      const entries = JSON.parse(raw) as [string, SharePayload][];
      for (const [k, v] of entries) g.__vitalidShares.set(k, v);
    } catch {
      /* no mirror yet — fine */
    }
  }
  return g.__vitalidShares;
}

function persistMirror() {
  try {
    const entries = Array.from(memoryMap().entries());
    fs.writeFileSync(STORE_FILE, JSON.stringify(entries));
  } catch {
    /* mirror is best-effort */
  }
}

async function redis(command: (string | number)[]): Promise<unknown> {
  const res = await fetch(`${REDIS_URL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const json = (await res.json()) as { result: unknown };
  return json.result;
}

export async function createShare(p: SharePayload): Promise<void> {
  if (useSupabase) return supabaseStore.createShare(p);
  if (useRedis) {
    const ex = Math.max(1, Math.floor((new Date(p.expiresAt).getTime() - Date.now()) / 1000) + 60);
    await redis(['SET', KEY_PREFIX + p.id, JSON.stringify(p), 'EX', ex]);
    await redis(['SADD', INDEX_KEY, p.id]);
    return;
  }
  memoryMap().set(p.id, p);
  persistMirror();
}

export async function getShare(id: string): Promise<SharePayload | null> {
  if (useSupabase) return supabaseStore.getShare(id);
  if (useRedis) {
    const raw = (await redis(['GET', KEY_PREFIX + id])) as string | null;
    return raw ? (JSON.parse(raw) as SharePayload) : null;
  }
  return memoryMap().get(id) ?? null;
}

export async function revokeShare(id: string): Promise<boolean> {
  if (useSupabase) return supabaseStore.revokeShare(id);
  const p = await getShare(id);
  if (!p) return false;
  const updated = { ...p, revoked: true };
  if (useRedis) {
    const ttl = Math.max(1, Math.floor((new Date(p.expiresAt).getTime() - Date.now()) / 1000) + 60);
    await redis(['SET', KEY_PREFIX + id, JSON.stringify(updated), 'EX', ttl]);
    return true;
  }
  memoryMap().set(id, updated);
  persistMirror();
  return true;
}

export async function setShareRecipients(
  id: string,
  sentTo: ShareRecipient[],
): Promise<SharePayload | null> {
  if (useSupabase) return supabaseStore.setShareRecipients(id, sentTo);
  const p = await getShare(id);
  if (!p || !isShareActive(p)) return null;
  const recipients = new Map<ShareRecipient['insurerId'], ShareRecipient>();
  for (const recipient of p.sentTo ?? []) recipients.set(recipient.insurerId, recipient);
  for (const recipient of sentTo) recipients.set(recipient.insurerId, recipient);
  const updated = { ...p, sentTo: Array.from(recipients.values()) };
  if (useRedis) {
    const ttl = Math.max(1, Math.floor((new Date(p.expiresAt).getTime() - Date.now()) / 1000) + 60);
    await redis(['SET', KEY_PREFIX + id, JSON.stringify(updated), 'EX', ttl]);
    return updated;
  }
  memoryMap().set(id, updated);
  persistMirror();
  return updated;
}

export async function listShares(): Promise<SharePayload[]> {
  if (useSupabase) return supabaseStore.listShares();
  if (useRedis) {
    const ids = (await redis(['SMEMBERS', INDEX_KEY])) as string[];
    const out: SharePayload[] = [];
    for (const id of ids ?? []) {
      const s = await getShare(id);
      if (s) out.push(s);
    }
    return out;
  }
  return Array.from(memoryMap().values());
}

export async function clearAll(): Promise<void> {
  if (useSupabase) return supabaseStore.clearAll();
  if (useRedis) {
    const ids = (await redis(['SMEMBERS', INDEX_KEY])) as string[];
    for (const id of ids ?? []) await redis(['DEL', KEY_PREFIX + id]);
    await redis(['DEL', INDEX_KEY]);
    return;
  }
  memoryMap().clear();
  persistMirror();
}
