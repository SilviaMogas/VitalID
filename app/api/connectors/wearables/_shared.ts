import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { getConsentStore } from '@/lib/consent';
import { CONSENT_POLICY_VERSIONS } from '@/lib/legal';
import { isOAuthWearable, type OAuthWearableId } from '@/lib/connectors/wearables/types';

export const NO_STORE = { headers: { 'Cache-Control': 'no-store' } };

export type ProviderCtx = { params: Promise<{ provider: string }> };

export async function resolveProvider(ctx: ProviderCtx): Promise<OAuthWearableId | null> {
  const { provider } = await ctx.params;
  return isOAuthWearable(provider) ? provider : null;
}

export const unknownProvider = () => NextResponse.json({ error: 'unknown_provider' }, { status: 404, ...NO_STORE });

export async function hasHealthConsent(userId: string): Promise<boolean> {
  const c = await getConsentStore().latest(userId).catch(() => null);
  return c?.health_data?.policyVersion === CONSENT_POLICY_VERSIONS.health_data;
}

export { getCurrentUser };
