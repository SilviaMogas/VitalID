import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { getConsentStore } from '@/lib/consent';
import { CONSENT_POLICY_VERSIONS } from '@/lib/legal';
import { buildAuthorizeUrl, issueState, publicOrigin, readWhoopEnv, whoopRedirectUri } from '@/lib/connectors/whoop';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const env = readWhoopEnv();
  if (!env) {
    return NextResponse.redirect(new URL('/?whoop=not_configured', publicOrigin(req)));
  }
  // Only a signed-in member with their own explicit health-data consent on
  // record may start a real wearable OAuth. Anonymous/demo sessions keep the
  // synthetic demo but never reach the provider (a client-side flag is not
  // authoritative).
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL('/?whoop=consent_required', publicOrigin(req)));
  }
  const consents = await getConsentStore().latest(user.id).catch(() => null);
  if (consents?.health_data?.policyVersion !== CONSENT_POLICY_VERSIONS.health_data) {
    return NextResponse.redirect(new URL('/?whoop=consent_required', publicOrigin(req)));
  }
  const state = await issueState(user.id);
  return NextResponse.redirect(buildAuthorizeUrl(state, whoopRedirectUri(req)));
}
