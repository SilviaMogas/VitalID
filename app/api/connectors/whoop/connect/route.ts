import { NextRequest, NextResponse } from 'next/server';
import { buildAuthorizeUrl, issueState, publicOrigin, readWhoopEnv, whoopRedirectUri } from '@/lib/connectors/whoop';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const env = readWhoopEnv();
  if (!env) {
    return NextResponse.redirect(new URL('/?whoop=not_configured', publicOrigin(req)));
  }
  const state = await issueState();
  return NextResponse.redirect(buildAuthorizeUrl(state, whoopRedirectUri(req)));
}
