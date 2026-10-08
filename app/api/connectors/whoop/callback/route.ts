import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { getCurrentUserKey } from '@/lib/membership/session';
import { getConsentStore } from '@/lib/consent';
import { getOnboardingStore } from '@/lib/onboarding/store';
import {
  consumeState,
  exchangeCode,
  getWhoopStore,
  publicOrigin,
  readWhoopEnv,
  syncWhoop,
  whoopRedirectUri,
} from '@/lib/connectors/whoop';
import type { UserBasicProfile } from '@/lib/connectors/whoop/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const home = (req: NextRequest, flag: string) => NextResponse.redirect(new URL(`/?whoop=${flag}`, publicOrigin(req)));

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  if (params.get('error')) return home(req, 'denied');

  const code = params.get('code');
  const state = params.get('state');
  if (!(await consumeState(state))) return home(req, 'invalid_state');
  if (!code) return home(req, 'error');

  // OAuth state is not bound to a session, so re-check the member's own
  // health-data consent here (the flow may have started while logged out).
  const user = await getCurrentUser();
  if (user) {
    const consents = await getConsentStore().latest(user.id).catch(() => null);
    if (!consents?.health_data) return home(req, 'consent_required');
  }

  const env = readWhoopEnv();
  if (!env) return home(req, 'not_configured');

  try {
    const tokens = await exchangeCode(code, whoopRedirectUri(req));

    // Fetch the WHOOP profile to bind the connection to a WHOOP user id.
    let whoopUserId: number | null = null;
    try {
      const res = await fetch(`${env.apiBase}/v2/user/profile/basic`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      if (res.ok) whoopUserId = ((await res.json()) as UserBasicProfile).user_id;
    } catch {
      /* profile lookup is best-effort; sync fills it in later */
    }

    const userKey = await getCurrentUserKey();
    const store = getWhoopStore();
    await store.upsert({
      userKey,
      whoopUserId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
      heightM: null,
      weightKg: null,
      maxHeartRate: null,
      connectedAt: new Date().toISOString(),
      lastSyncedAt: null,
      lastSyncError: null,
    });

    // Members also get the onboarding connector preference flipped to connected.
    if (user) {
      await getOnboardingStore().setConnectorStatus(
        user.id,
        'whoop',
        'connected',
        new Date().toISOString(),
      );
    }

    // Best-effort first sync — the dashboard reads stored rows afterwards.
    await syncWhoop(userKey).catch(() => undefined);

    return home(req, 'connected');
  } catch {
    return home(req, 'error');
  }
}
