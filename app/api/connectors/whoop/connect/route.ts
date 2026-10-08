import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { getConsentStore } from '@/lib/consent';
import { buildAuthorizeUrl, issueState, publicOrigin, readWhoopEnv, whoopRedirectUri } from '@/lib/connectors/whoop';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const env = readWhoopEnv();
  if (!env) {
    return NextResponse.redirect(new URL('/?whoop=not_configured', publicOrigin(req)));
  }
  // Members must have their own explicit health-data consent on record before
  // any wearable data is read; a client-side flag is not authoritative.
  const user = await getCurrentUser();
  if (user) {
    const consents = await getConsentStore().latest(user.id).catch(() => null);
    if (!consents?.health_data) {
      return NextResponse.redirect(new URL('/?whoop=consent_required', publicOrigin(req)));
    }
  }
  const state = await issueState();
  return NextResponse.redirect(buildAuthorizeUrl(state, whoopRedirectUri(req)));
}
