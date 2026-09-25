import 'server-only';
import { readWhoopEnv } from './env';
import { WhoopError, refreshTokens } from './oauth';
import { getWhoopStore, type WhoopConnection } from './store';
import type { Paginated } from './types';

/**
 * Authenticated WHOOP API client (server-only).
 *
 * Token lifecycle: refresh proactively when the access token expires within
 * 60s, persist the rotated pair BEFORE any API call, and on 401 retry once
 * after a forced refresh. A failed refresh is recorded on the connection so
 * the UI can ask the user to reconnect.
 */

function ensureConfigured() {
  const env = readWhoopEnv();
  if (!env) throw new WhoopError('not_configured', 'WHOOP is not configured');
  return env;
}

function isExpired(conn: WhoopConnection): boolean {
  return new Date(conn.expiresAt).getTime() - 60_000 <= Date.now();
}

/**
 * Concurrent callers (the sync fans out six requests) share one refresh per
 * user: WHOOP rotates refresh tokens, so a second parallel refresh with the
 * same token would be rejected.
 */
const inflightRefresh = new Map<string, Promise<WhoopConnection>>();

function refreshAndPersist(userKey: string, conn: WhoopConnection): Promise<WhoopConnection> {
  const existing = inflightRefresh.get(userKey);
  if (existing) return existing;
  const p = doRefresh(userKey, conn).finally(() => {
    if (inflightRefresh.get(userKey) === p) inflightRefresh.delete(userKey);
  });
  inflightRefresh.set(userKey, p);
  return p;
}

const RACE_REREAD_DELAY_MS = 1500;

async function rotate(userKey: string, conn: WhoopConnection): Promise<WhoopConnection> {
  const tokens = await refreshTokens(conn.refreshToken);
  // Rotated pair must be persisted before it is ever used.
  await getWhoopStore().updateTokens(userKey, {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
  });
  return { ...conn, ...tokens };
}

/** The pair another instance persisted after winning the rotation race, if any. */
async function rotatedByOther(userKey: string, conn: WhoopConnection): Promise<WhoopConnection | null> {
  const store = getWhoopStore();
  let latest = await store.get(userKey).catch(() => null);
  if (!latest || latest.refreshToken === conn.refreshToken) {
    // The winner may not have written yet; give it one short grace period.
    await new Promise((r) => setTimeout(r, RACE_REREAD_DELAY_MS));
    latest = await store.get(userKey).catch(() => null);
  }
  return latest && latest.refreshToken !== conn.refreshToken ? latest : null;
}

async function doRefresh(userKey: string, conn: WhoopConnection): Promise<WhoopConnection> {
  try {
    return await rotate(userKey, conn);
  } catch (e) {
    // The in-flight map only covers this process; another instance may have
    // rotated the pair (making ours invalid). Reuse it instead of failing,
    // refreshing once more if the newer access token is itself about to expire.
    let attempted = conn;
    const other = await rotatedByOther(userKey, conn);
    if (other) {
      if (!isExpired(other)) return other;
      attempted = other;
      try {
        return await rotate(userKey, other);
      } catch {
        // Lost a second race on the same pair: accept whatever newer pair won.
        const newer = await rotatedByOther(userKey, other);
        if (newer && !isExpired(newer)) return newer;
      }
    }
    const err =
      e instanceof WhoopError && e.code === 'refresh_failed'
        ? e
        : new WhoopError(
            'refresh_failed',
            e instanceof Error ? e.message : 'WHOOP refresh failed',
          );
    // Conditional on the row still holding the token we failed with, so a
    // pair rotated by another instance is never flagged as needing reauth.
    await getWhoopStore()
      .markRefreshFailed(userKey, attempted.refreshToken)
      .catch(() => undefined);
    throw err;
  }
}

async function apiGet<T>(apiBase: string, path: string, accessToken: string, query?: Record<string, string>): Promise<{ status: number; data: T | null }> {
  const url = new URL(`${apiBase}${path}`);
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);
  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  } catch (e) {
    throw new WhoopError('unavailable', `WHOOP API unreachable: ${(e as Error).message}`);
  }
  if (res.status === 401) return { status: 401, data: null };
  if (res.status === 429 || res.status >= 500) {
    throw new WhoopError('unavailable', `WHOOP API unavailable (${res.status})`, res.status);
  }
  if (!res.ok) {
    throw new WhoopError('oauth_failed', `WHOOP API error (${res.status})`, res.status);
  }
  return { status: res.status, data: (await res.json()) as T };
}

export async function whoopGet<T>(userKey: string, path: string, query?: Record<string, string>): Promise<T> {
  const env = ensureConfigured();
  const store = getWhoopStore();
  let conn = await store.get(userKey);
  if (!conn) throw new WhoopError('unauthorized', 'No WHOOP connection for this user');
  if (isExpired(conn)) conn = await refreshAndPersist(userKey, conn);

  const first = await apiGet<T>(env.apiBase, path, conn.accessToken, query);
  if (first.status !== 401) return first.data as T;

  // Another request may already have rotated the tokens; reuse them before refreshing again.
  const latest = await store.get(userKey);
  conn =
    latest && latest.accessToken !== conn.accessToken && !isExpired(latest)
      ? latest
      : await refreshAndPersist(userKey, latest ?? conn);
  const retry = await apiGet<T>(env.apiBase, path, conn.accessToken, query);
  if (retry.status === 401) {
    throw new WhoopError('unauthorized', 'WHOOP API still returns 401 after refresh', 401);
  }
  return retry.data as T;
}

const PAGE_LIMIT = '25';
const MAX_PAGES = 10;

/** Follows `next_token` pagination (max 10 pages of 25 records). */
export async function whoopGetAll<T>(
  userKey: string,
  path: string,
  opts: { start?: string; end?: string } = {},
): Promise<T[]> {
  const records: T[] = [];
  let nextToken: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const query: Record<string, string> = { limit: PAGE_LIMIT };
    if (opts.start) query.start = opts.start;
    if (opts.end) query.end = opts.end;
    if (nextToken) query.nextToken = nextToken;
    const page_data = await whoopGet<Paginated<T>>(userKey, path, query);
    records.push(...(page_data.records ?? []));
    nextToken = page_data.next_token ?? null;
    if (!nextToken) break;
  }
  return records;
}
