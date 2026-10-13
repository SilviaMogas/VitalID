import { NextRequest, NextResponse } from 'next/server';
import { getOnboardingStore } from '@/lib/onboarding/store';
import {
  consumeState, exchangeCode, getWearableStore, isProviderConfigured, publicOrigin, redirectUri, syncWearable,
} from '@/lib/connectors/wearables';
import { getCurrentUser, hasHealthConsent, resolveProvider, unknownProvider, type ProviderCtx } from '../../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, ctx: ProviderCtx) {
  const id = await resolveProvider(ctx);
  if (!id) return unknownProvider();
  const home = (flag: string) => NextResponse.redirect(new URL(`/?${id}=${flag}`, publicOrigin(req)));

  const params = req.nextUrl.searchParams;
  if (params.get('error')) return home('denied');
  const stateUserId = await consumeState(id, params.get('state'));
  if (!stateUserId) return home('invalid_state');
  const code = params.get('code');
  if (!code) return home('error');
  if (!isProviderConfigured(id)) return home('not_configured');

  // Re-validate before exchanging the code: same member, still consented.
  const user = await getCurrentUser();
  if (!user || user.id !== stateUserId) return home('invalid_state');
  if (!(await hasHealthConsent(user.id))) return home('consent_required');

  try {
    const t = await exchangeCode(id, code, redirectUri(id, req));
    await getWearableStore().upsert({
      userKey: user.id,
      provider: id,
      externalUserId: t.externalUserId,
      accessToken: t.accessToken,
      refreshToken: t.refreshToken,
      expiresAt: t.expiresAt,
      scope: t.scope,
      connectedAt: new Date().toISOString(),
      lastSyncedAt: null,
      lastSyncError: null,
    });
    await getOnboardingStore().setConnectorStatus(user.id, id, 'connected', new Date().toISOString());
    await syncWearable(id, user.id).catch(() => undefined); // best-effort first sync
    return home('connected');
  } catch {
    return home('error');
  }
}
