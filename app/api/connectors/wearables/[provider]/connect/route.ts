import { NextRequest, NextResponse } from 'next/server';
import { buildAuthorizeUrl, issueState, isProviderConfigured, publicOrigin, redirectUri } from '@/lib/connectors/wearables';
import { getCurrentUser, hasHealthConsent, resolveProvider, unknownProvider, type ProviderCtx } from '../../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, ctx: ProviderCtx) {
  const id = await resolveProvider(ctx);
  if (!id) return unknownProvider();
  const back = (flag: string) => NextResponse.redirect(new URL(`/?${id}=${flag}`, publicOrigin(req)));
  if (!isProviderConfigured(id)) return back('not_configured');
  // Only a signed-in member with current health-data consent may start a real OAuth.
  const user = await getCurrentUser();
  if (!user || !(await hasHealthConsent(user.id))) return back('consent_required');
  const state = await issueState(id, user.id);
  return NextResponse.redirect(buildAuthorizeUrl(id, state, redirectUri(id, req)));
}
