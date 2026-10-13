import 'server-only';
import { readProviderEnv } from './registry';
import { WearableError, refreshTokens } from './oauth';
import { getWearableStore, type WearableConnection } from './store';
import type { OAuthWearableId } from './types';

/**
 * Authenticated GET with proactive refresh (<60s left), one retry after a 401,
 * and backoff on 429/5xx. Rotated refresh tokens are persisted BEFORE use.
 * Concurrent callers share one refresh per (user, provider) within a process.
 */

const inflight = new Map<string, Promise<WearableConnection>>();
const isExpired = (c: WearableConnection) => new Date(c.expiresAt).getTime() - 60_000 <= Date.now();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function refresh(id: OAuthWearableId, userKey: string, conn: WearableConnection): Promise<WearableConnection> {
  const key = `${id}|${userKey}`;
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = (async () => {
    if (!conn.refreshToken) throw new WearableError('refresh_failed', `${id} has no refresh token`);
    try {
      const t = await refreshTokens(id, conn.refreshToken);
      await getWearableStore().updateTokens(userKey, id, t);
      return { ...conn, accessToken: t.accessToken, refreshToken: t.refreshToken, expiresAt: t.expiresAt };
    } catch (e) {
      await getWearableStore().markSync(userKey, id, { lastSyncError: 'refresh_failed' }).catch(() => undefined);
      throw e;
    }
  })().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

async function apiGet<T>(base: string, path: string, token: string, query: Record<string, string>) {
  const url = new URL(`${base}${path}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  for (let attempt = 0; ; attempt++) {
    const last = attempt === 2;
    let res: Response;
    try {
      res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) {
      if (!last) { await sleep(400 * 2 ** attempt); continue; }
      throw new WearableError('unavailable', `API unreachable: ${(e as Error).message}`);
    }
    if (res.status === 401) return { status: 401, data: null as T | null };
    if (res.status === 429 || res.status >= 500) {
      if (!last) {
        const ra = Number(res.headers.get('retry-after'));
        await sleep(Number.isFinite(ra) && ra > 0 ? Math.min(ra * 1000, 10_000) : 400 * 2 ** attempt);
        continue;
      }
      throw new WearableError('unavailable', `API unavailable (${res.status})`, res.status);
    }
    if (!res.ok) throw new WearableError('oauth_failed', `API error (${res.status})`, res.status);
    return { status: 200, data: (await res.json()) as T };
  }
}

export async function wearableGet<T>(id: OAuthWearableId, userKey: string, path: string, query: Record<string, string> = {}): Promise<T> {
  const env = readProviderEnv(id);
  if (!env) throw new WearableError('not_configured', `${id} is not configured`);
  const store = getWearableStore();
  let conn = await store.get(userKey, id);
  if (!conn) throw new WearableError('unauthorized', `No ${id} connection for this user`);
  if (isExpired(conn)) conn = await refresh(id, userKey, conn);
  const first = await apiGet<T>(env.apiBase, path, conn.accessToken, query);
  if (first.status !== 401) return first.data as T;
  const latest = await store.get(userKey, id);
  conn = latest && latest.accessToken !== conn.accessToken && !isExpired(latest) ? latest : await refresh(id, userKey, latest ?? conn);
  const retry = await apiGet<T>(env.apiBase, path, conn.accessToken, query);
  if (retry.status === 401) throw new WearableError('unauthorized', `${id} still 401 after refresh`, 401);
  return retry.data as T;
}
