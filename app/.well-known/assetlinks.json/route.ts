import { seekerAndroidPackage } from '@/lib/solpay/seeker-identity';

export const dynamic = 'force-dynamic';

export function GET() {
  const fingerprint = process.env.SEEKER_ANDROID_CERT_SHA256?.trim() ?? '';
  if (!/^(?:[a-f0-9]{64}|[a-f0-9]{2}(?::[a-f0-9]{2}){31})$/i.test(fingerprint)) {
    return Response.json({ error: 'not_found' }, {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
  const sha256 = fingerprint.replaceAll(':', '').toUpperCase().match(/.{2}/g)!.join(':');

  return Response.json([{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: seekerAndroidPackage,
      sha256_cert_fingerprints: [sha256],
    },
  }], { headers: { 'Cache-Control': 'public, max-age=300' } });
}
