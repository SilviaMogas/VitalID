import 'server-only';
import { createHash } from 'node:crypto';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export const EMAIL_LIMIT = 10;
export const IP_LIMIT = 50;
export const WINDOW_SECONDS = 15 * 60;
export const SIGNUP_EMAIL_LIMIT = 3;
export const SIGNUP_IP_LIMIT = 10;
export const SIGNUP_WINDOW_SECONDS = 60 * 60;

export interface LoginThrottleStore {
  hit(key: string, limit: number, windowSeconds: number): Promise<number>;
  clear(key: string): Promise<void>;
}

const TABLE = 'vital_id_auth_attempts';

class SupabaseLoginThrottleStore implements LoginThrottleStore {
  async hit(key: string, limit: number, windowSeconds: number): Promise<number> {
    const { data, error } = await getSupabaseServerClient().rpc('vital_id_auth_attempt', {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error || typeof data !== 'number' || !Number.isFinite(data)) {
      throw new Error('Login throttle RPC failed');
    }
    return data;
  }

  async clear(key: string): Promise<void> {
    const { error } = await getSupabaseServerClient().from(TABLE).delete().eq('key', key);
    if (error) throw new Error('Login throttle clear failed');
  }
}

interface MemoryAttempt {
  windowStart: number;
  attempts: number;
}

interface MemoryGlobal {
  __vitalIdLoginThrottleAttempts?: Map<string, MemoryAttempt>;
}

class MemoryLoginThrottleStore implements LoginThrottleStore {
  private attempts(): Map<string, MemoryAttempt> {
    const g = globalThis as MemoryGlobal;
    g.__vitalIdLoginThrottleAttempts ??= new Map();
    return g.__vitalIdLoginThrottleAttempts;
  }

  async hit(key: string, limit: number, windowSeconds: number): Promise<number> {
    const attempts = this.attempts();
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const current = attempts.get(key);
    const entry = !current || current.windowStart <= now - windowMs
      ? { windowStart: now, attempts: 0 }
      : current;
    entry.attempts += 1;
    attempts.set(key, entry);
    if (entry.attempts <= limit) return 0;
    return Math.max(1, Math.ceil((entry.windowStart + windowMs - now) / 1000));
  }

  async clear(key: string): Promise<void> {
    this.attempts().delete(key);
  }
}

interface StoreGlobal {
  __vitalIdLoginThrottleStore?: { backend: 'supabase' | 'memory'; store: LoginThrottleStore };
}

function getBackend(): 'supabase' | 'memory' {
  return process.env.AUTH_THROTTLE_STORE === 'memory'
    ? 'memory'
    : process.env.AUTH_THROTTLE_STORE === 'supabase' || isSupabaseConfigured()
      ? 'supabase'
      : 'memory';
}

function getStore(backend = getBackend()): LoginThrottleStore {
  const g = globalThis as StoreGlobal;
  if (g.__vitalIdLoginThrottleStore?.backend === backend) return g.__vitalIdLoginThrottleStore.store;
  const store = backend === 'supabase' ? new SupabaseLoginThrottleStore() : new MemoryLoginThrottleStore();
  g.__vitalIdLoginThrottleStore = { backend, store };
  return store;
}

async function withStoreFallback<T>(operation: (store: LoginThrottleStore) => Promise<T>): Promise<T> {
  const backend = getBackend();
  try {
    return await operation(getStore(backend));
  } catch {
    if (backend !== 'supabase') throw new Error('Login throttle memory store failed');
    console.error('Login throttle Supabase store failed; using memory store.');
    return operation(getStore('memory'));
  }
}

/** Counts one attempt for key; returns 0 if within limit, else seconds until the window resets. */
export async function hitAttemptLimit(key: string, limit: number, windowSeconds: number): Promise<number> {
  return withStoreFallback((store) => store.hit(key, limit, windowSeconds));
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function clientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  const forwardedIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (realIp || forwardedIp || 'unknown').slice(0, 64);
}

export async function throttlePasswordLogin<T>(
  request: Request,
  email: string,
  attempt: () => Promise<T>,
  succeeded: (result: T) => boolean,
): Promise<{ limited: true; retryAfterSeconds: number } | { limited: false; result: T }> {
  const emailKey = `email:${sha256(email.trim().toLowerCase())}`;
  const ipKey = `ip:${sha256(clientIp(request))}`;
  const [emailRetryAfter, ipRetryAfter] = await Promise.all([
    withStoreFallback((store) => store.hit(emailKey, EMAIL_LIMIT, WINDOW_SECONDS)),
    withStoreFallback((store) => store.hit(ipKey, IP_LIMIT, WINDOW_SECONDS)),
  ]);
  const retryAfterSeconds = Math.max(emailRetryAfter, ipRetryAfter);
  if (retryAfterSeconds > 0) return { limited: true, retryAfterSeconds };

  const result = await attempt();
  if (succeeded(result)) await withStoreFallback((store) => store.clear(emailKey));
  return { limited: false, result };
}

/** Counts every sign-up attempt per email and per client IP; returns seconds to wait (0 = allowed). */
export async function throttleSignup(request: Request, email: string): Promise<number> {
  const emailKey = `signup-email:${sha256(email.trim().toLowerCase())}`;
  const ipKey = `signup-ip:${sha256(clientIp(request))}`;
  const [emailRetryAfter, ipRetryAfter] = await Promise.all([
    withStoreFallback((store) => store.hit(emailKey, SIGNUP_EMAIL_LIMIT, SIGNUP_WINDOW_SECONDS)),
    withStoreFallback((store) => store.hit(ipKey, SIGNUP_IP_LIMIT, SIGNUP_WINDOW_SECONDS)),
  ]);
  return Math.max(emailRetryAfter, ipRetryAfter);
}
