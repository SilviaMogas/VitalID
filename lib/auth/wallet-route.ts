import { NextResponse } from 'next/server';
import { clearSessionCookies, signInWithWallet } from '@/lib/auth/server';
import { hasCurrentHealthConsent, getConsentStore } from '@/lib/consent';
import { CONSENT_POLICY_VERSIONS } from '@/lib/legal';
import type { WalletChain } from '@/lib/auth/wallet-identity';
import { isSameOrigin } from '@/lib/share-api';

const NO_STORE = { headers: { 'Cache-Control': 'no-store' } };
const LOOPBACK_HOST_RE = /^(127\.0\.0\.1|\[::1\])(?::\d+)?$/;

export function walletJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, ...NO_STORE });
}

export function walletRequestOrigin(req: Request): URL | null {
  if (!isSameOrigin(req)) return null;
  try {
    const requestUrl = new URL(req.url);
    const rawHost = req.headers.get('host');
    const loopbackHost =
      requestUrl.hostname === 'localhost' && rawHost && LOOPBACK_HOST_RE.test(rawHost)
        ? rawHost
        : null;
    const origin = new URL(
      loopbackHost ? `${requestUrl.protocol}//${loopbackHost}` : requestUrl.origin,
    );
    return origin.protocol === 'http:' || origin.protocol === 'https:' ? new URL(origin.origin) : null;
  } catch {
    return null;
  }
}

export async function completeWalletSignIn(
  address: string,
  chain: WalletChain,
  consents: { consentTerms: boolean; consentHealthData: boolean },
): Promise<NextResponse> {
  try {
    const result = await signInWithWallet(address, consents, chain);
    if (!result.ok) {
      const status = result.code === 'not_configured' ? 503 : result.code === 'consent_required' ? 400 : 500;
      return walletJson({ error: result.code }, status);
    }

    try {
      const store = getConsentStore();
      const latest = await store.latest(result.user.id);
      const needsAudit =
        !hasCurrentHealthConsent(latest) ||
        latest?.terms_of_service?.policyVersion !== CONSENT_POLICY_VERSIONS.terms_of_service ||
        latest?.privacy_policy?.policyVersion !== CONSENT_POLICY_VERSIONS.privacy_policy;
      if (needsAudit) {
        if (consents.consentTerms !== true || consents.consentHealthData !== true) {
          await clearSessionCookies();
          return walletJson({ error: 'consent_required' }, 400);
        }
        await store.record(result.user.id, 'privacy_policy', CONSENT_POLICY_VERSIONS.privacy_policy);
        await store.record(result.user.id, 'terms_of_service', CONSENT_POLICY_VERSIONS.terms_of_service);
        await store.record(result.user.id, 'health_data', CONSENT_POLICY_VERSIONS.health_data);
      }
    } catch (error) {
      console.error('[wallet/verify] consent audit failed', error);
      await clearSessionCookies().catch(() => undefined);
      return walletJson({ error: 'consent_audit_failed' }, 503);
    }
    return walletJson({ next: '/' });
  } catch (error) {
    console.error('[wallet/verify] wallet sign-in failed', error);
    await clearSessionCookies().catch(() => undefined);
    return walletJson({ error: 'unavailable' }, 503);
  }
}

export async function parseWalletJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json();
    return body && typeof body === 'object' && !Array.isArray(body)
      ? body as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}
