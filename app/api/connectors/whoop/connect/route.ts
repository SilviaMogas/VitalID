import { NextRequest, NextResponse } from 'next/server';
import { buildAuthorizeUrl, issueState, readWhoopEnv } from '@/lib/connectors/whoop';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const env = readWhoopEnv();
  if (!env) {
    return NextResponse.redirect(new URL('/?whoop=not_configured', req.url));
  }
  const redirectUri =
    env.redirectUri ??
    new URL('/api/connectors/whoop/callback', process.env.NEXT_PUBLIC_APP_URL ?? req.url).toString();
  const state = await issueState();
  return NextResponse.redirect(buildAuthorizeUrl(state, redirectUri));
}
