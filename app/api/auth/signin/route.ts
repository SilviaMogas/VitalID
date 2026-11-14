import { NextResponse } from 'next/server';
import { sessionRequestRejection } from '@/lib/same-origin';
import { signInWithPassword } from '@/lib/auth/server';
import { resolveNextRoute } from '@/lib/auth/next-route';
import { throttlePasswordLogin } from '@/lib/auth/login-throttle';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const rejected = sessionRequestRejection(req, { requireJson: true });
  if (rejected) return rejected;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });

  const throttled = await throttlePasswordLogin(
    req,
    email,
    () => signInWithPassword({ email, password }),
    (result) => result.ok,
  );
  if (throttled.limited) {
    return NextResponse.json(
      { error: 'rate_limited' },
      {
        status: 429,
        headers: {
          'Retry-After': String(throttled.retryAfterSeconds),
          'Cache-Control': 'no-store',
        },
      },
    );
  }
  const result = throttled.result;
  if (!result.ok) {
    const status = result.code === 'not_configured' ? 503 : result.code === 'email_not_confirmed' ? 403 : 401;
    return NextResponse.json({ error: result.code }, { status });
  }
  const next = await resolveNextRoute(result.user.id);
  return NextResponse.json({ userId: result.user.id, next }, { headers: { 'Cache-Control': 'no-store' } });
}
