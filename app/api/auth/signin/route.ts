import { NextResponse } from 'next/server';
import { signInWithPassword } from '@/lib/auth/server';
import { resolveNextRoute } from '@/lib/auth/next-route';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });

  const result = await signInWithPassword({ email, password });
  if (!result.ok) {
    const status = result.code === 'not_configured' ? 503 : 401;
    return NextResponse.json({ error: result.code }, { status });
  }
  const next = await resolveNextRoute(result.user.id);
  return NextResponse.json({ userId: result.user.id, next }, { headers: { 'Cache-Control': 'no-store' } });
}
