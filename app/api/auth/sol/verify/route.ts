import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { clearSessionCookies, isAuthConfigured, signInWithWallet } from '@/lib/auth/server';
import { verifyWalletMessage } from '@/lib/solpay/wallet-auth';
import { getConsentStore } from '@/lib/consent';
import { PRIVACY_VERSION, TERMS_VERSION } from '@/lib/legal';

export async function POST(req: NextRequest) {
  if (!isAuthConfigured()) return NextResponse.json({ error: 'auth_not_configured' }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as {
    publicKey?: string;
    signature?: string;
    message?: string;
    consentTerms?: boolean;
    consentHealthData?: boolean;
  };
  const publicKey = typeof body.publicKey === 'string' ? body.publicKey.trim() : '';
  const signature = typeof body.signature === 'string' ? body.signature.trim() : '';
  const message = typeof body.message === 'string' ? body.message : '';
  if (!publicKey || !signature || !message) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }
  const host = (await headers()).get('host') ?? 'vitalid.site';
  const verdict = await verifyWalletMessage(publicKey, signature, message, host);
  if (verdict === 'bad_signature') return NextResponse.json({ error: 'bad_signature' }, { status: 401 });
  if (verdict !== 'ok') return NextResponse.json({ error: verdict }, { status: 400 });
  const result = await signInWithWallet(publicKey, {
    consentTerms: body.consentTerms === true,
    consentHealthData: body.consentHealthData === true,
  });
  if (!result.ok) {
    const status =
      result.code === 'not_configured' ? 503 : result.code === 'consent_required' ? 400 : 500;
    return NextResponse.json({ error: result.code }, { status });
  }
  if (result.created) {
    // Same audit as password signup: terms + health-data consent, append-only.
    // On failure the session is dropped so no account runs without the record.
    try {
      const store = getConsentStore();
      await store.record(result.user.id, 'privacy_policy', PRIVACY_VERSION);
      await store.record(result.user.id, 'terms_of_service', TERMS_VERSION);
      await store.record(result.user.id, 'health_data', PRIVACY_VERSION);
    } catch (err) {
      console.error('[sol/verify] consent audit write failed', err);
      await clearSessionCookies();
      return NextResponse.json({ error: 'consent_audit_failed' }, { status: 503 });
    }
  }
  return NextResponse.json({ next: '/' });
}
