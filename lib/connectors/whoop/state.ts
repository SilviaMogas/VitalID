import 'server-only';
import crypto from 'crypto';
import { cookies } from 'next/headers';

/**
 * OAuth `state` CSRF protection: a 32-hex random stored in a short-lived
 * httpOnly cookie together with the user id that initiated the flow, compared
 * timing-safely on the callback. Binding the initiating user prevents an OAuth
 * grant started by one session from being claimed by another.
 */

const COOKIE = 'vitalid_whoop_state';
const MAX_AGE = 600; // 10 minutes

export async function issueState(userId: string): Promise<string> {
  const state = crypto.randomBytes(16).toString('hex');
  const store = await cookies();
  store.set(COOKIE, `${userId}:${state}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
  return state;
}

/**
 * Reads + deletes the state cookie; returns the initiating user id when
 * `received` matches (timing-safe), null otherwise.
 */
export async function consumeState(received: string | null): Promise<string | null> {
  const store = await cookies();
  const expected = store.get(COOKIE)?.value;
  store.delete(COOKIE);
  if (!expected || !received) return null;
  const sep = expected.indexOf(':');
  if (sep < 1) return null;
  const userId = expected.slice(0, sep);
  const stored = expected.slice(sep + 1);
  const a = Buffer.from(stored);
  const b = Buffer.from(received);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return userId;
}
