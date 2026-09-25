import 'server-only';
import type { NextRequest } from 'next/server';
import { readWhoopEnv } from './env';

const CALLBACK_PATH = '/api/connectors/whoop/callback';

/**
 * Public origin of the current request. Behind Vercel/proxies `req.url` is the
 * internal address, so prefer the forwarded headers, then NEXT_PUBLIC_APP_URL.
 */
export function publicOrigin(req: NextRequest): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return new URL(appUrl).origin;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https');
  if (host) return `${proto}://${host.split(',')[0].trim()}`;
  return new URL(req.url).origin;
}

/** Exact redirect_uri to send to WHOOP — must equal the dashboard registration. */
export function whoopRedirectUri(req: NextRequest): string {
  const origin = publicOrigin(req);
  const configured = (readWhoopEnv()?.redirectUri ?? '').split(/[\s,]+/).filter(Boolean);
  if (configured.length === 0) return `${origin}${CALLBACK_PATH}`;
  return configured.find((uri) => uri.startsWith(`${origin}/`)) ?? configured[0];
}
