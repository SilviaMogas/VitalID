import { NextResponse } from 'next/server';
import { isSameOrigin } from '@/lib/share-api';

const NO_STORE = { 'Cache-Control': 'no-store' };

// Session-issuing POSTs must come from our own pages: HTML forms can post
// cross-site but cannot send application/json without a CORS preflight.
export function rejectCrossSiteJsonPost(req: Request): NextResponse | null {
  if (req.headers.get('sec-fetch-site')?.toLowerCase() === 'cross-site' || !isSameOrigin(req)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: NO_STORE });
  }
  const contentType = req.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return NextResponse.json({ error: 'unsupported_media_type' }, { status: 415, headers: NO_STORE });
  }
  return null;
}
