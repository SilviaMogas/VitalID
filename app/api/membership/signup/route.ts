import { NextResponse } from 'next/server';
import { createUserSession } from '@/lib/membership/session';
import { getMembershipStore } from '@/lib/membership/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const { displayName, email } = (body ?? {}) as { displayName?: string; email?: string };

  const name = typeof displayName === 'string' ? displayName.trim() : '';
  const mail = typeof email === 'string' ? email.trim() : '';
  if (!name || name.length > 120) {
    return NextResponse.json({ error: 'invalid displayName' }, { status: 400 });
  }
  if (!mail || mail.length > 254 || !EMAIL_RE.test(mail)) {
    return NextResponse.json({ error: 'invalid email' }, { status: 400 });
  }

  const { userKey } = await createUserSession();
  const membership = await getMembershipStore().upsert({
    userKey,
    displayName: name,
    email: mail,
  });
  return NextResponse.json(
    { userKey, plan: membership.plan },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
