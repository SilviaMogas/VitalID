import 'server-only';
import crypto from 'crypto';
import { cookies } from 'next/headers';

/**
 * OAuth `state` CSRF protection: a 32-hex random stored in a short-lived
 * httpOnly cookie, compared timing-safely on the callback.
 */

const COOKIE = 'vitalid_whoop_state';
const MAX_AGE = 600; // 10 minutes

export async function issueState(): Promise<string> {
  const state = crypto.randomBytes(16).toString('hex');
  const store = await cookies();
  store.set(COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
  return state;
}

/** Reads + deletes the state cookie; true when it matches `received` (timing-safe). */
export async function consumeState(received: string | null): Promise<boolean> {
  const store = await cookies();
  const expected = store.get(COOKIE)?.value;
  store.delete(COOKIE);
  if (!expected || !received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
