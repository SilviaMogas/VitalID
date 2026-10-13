import 'server-only';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import type { OAuthWearableId } from './types';

/** OAuth `state` CSRF cookie bound to the initiating user (same scheme as WHOOP). */
const cookieName = (id: OAuthWearableId) => `vitalid_${id}_state`;

export async function issueState(id: OAuthWearableId, userId: string): Promise<string> {
  const state = crypto.randomBytes(16).toString('hex');
  (await cookies()).set(cookieName(id), `${userId}:${state}`, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 600,
  });
  return state;
}

export async function consumeState(id: OAuthWearableId, received: string | null): Promise<string | null> {
  const store = await cookies();
  const expected = store.get(cookieName(id))?.value;
  store.delete(cookieName(id));
  if (!expected || !received) return null;
  const sep = expected.indexOf(':');
  if (sep < 1) return null;
  const a = Buffer.from(expected.slice(sep + 1));
  const b = Buffer.from(received);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return expected.slice(0, sep);
}
