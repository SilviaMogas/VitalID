import 'server-only';
import type { NextRequest } from 'next/server';
import { OAUTH_PROVIDERS, readProviderEnv } from './registry';
import type { OAuthWearableId } from './types';

export type WearableErrorCode =
  | 'not_configured' | 'oauth_failed' | 'refresh_failed' | 'unavailable' | 'unauthorized';

export class WearableError extends Error {
  code: WearableErrorCode;
  status?: number;
  constructor(code: WearableErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'WearableError';
    this.code = code;
    this.status = status;
  }
}

export interface WearableTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
  scope: string | null;
  externalUserId: string | null;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number; // Strava: epoch seconds
  scope?: string;
  athlete?: { id?: number };
}

const CALLBACK = (id: OAuthWearableId) => `/api/connectors/wearables/${id}/callback`;

export function publicOrigin(req: NextRequest): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return new URL(appUrl).origin;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https');
  if (host) return `${proto}://${host.split(',')[0].trim()}`;
  return new URL(req.url).origin;
}

export function redirectUri(id: OAuthWearableId, req: NextRequest): string {
  const origin = publicOrigin(req);
  const configured = (readProviderEnv(id)?.redirectUri ?? '').split(/[\s,]+/).filter(Boolean);
  if (configured.length === 0) return `${origin}${CALLBACK(id)}`;
  return configured.find((u) => u.startsWith(`${origin}/`)) ?? configured[0];
}

export function buildAuthorizeUrl(id: OAuthWearableId, state: string, redirect: string): string {
  const env = readProviderEnv(id);
  if (!env) throw new WearableError('not_configured', `${id} is not configured`);
  const cfg = OAUTH_PROVIDERS[id];
  const url = new URL(env.authorizeUrl);
  url.searchParams.set('client_id', env.clientId);
  url.searchParams.set('redirect_uri', redirect);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', cfg.scopes);
  url.searchParams.set('state', state);
  for (const [k, v] of Object.entries(cfg.extraAuthorizeParams ?? {})) url.searchParams.set(k, v);
  return url.toString();
}

async function tokenRequest(id: OAuthWearableId, params: Record<string, string>): Promise<TokenResponse> {
  const env = readProviderEnv(id);
  if (!env) throw new WearableError('not_configured', `${id} is not configured`);
  let res: Response;
  try {
    res = await fetch(env.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ ...params, client_id: env.clientId, client_secret: env.clientSecret }),
    });
  } catch (e) {
    throw new WearableError('unavailable', `${id} token endpoint unreachable: ${(e as Error).message}`);
  }
  if (!res.ok) throw new WearableError('oauth_failed', `${id} token request failed (${res.status})`, res.status);
  return (await res.json()) as TokenResponse;
}

function toTokens(id: string, raw: TokenResponse, previousRefresh?: string | null): WearableTokens {
  if (!raw.access_token) throw new WearableError('oauth_failed', `${id} token response missing access_token`);
  const expiresAt = raw.expires_at
    ? new Date(raw.expires_at * 1000).toISOString()
    : new Date(Date.now() + (raw.expires_in ?? 3600) * 1000).toISOString();
  return {
    accessToken: raw.access_token,
    refreshToken: raw.refresh_token ?? previousRefresh ?? null,
    expiresAt,
    scope: raw.scope ?? null,
    externalUserId: raw.athlete?.id != null ? String(raw.athlete.id) : null,
  };
}

export async function exchangeCode(id: OAuthWearableId, code: string, redirect: string): Promise<WearableTokens> {
  return toTokens(id, await tokenRequest(id, { grant_type: 'authorization_code', code, redirect_uri: redirect }));
}

export async function refreshTokens(id: OAuthWearableId, refreshToken: string): Promise<WearableTokens> {
  try {
    return toTokens(id, await tokenRequest(id, { grant_type: 'refresh_token', refresh_token: refreshToken }), refreshToken);
  } catch (e) {
    if (e instanceof WearableError && e.code === 'not_configured') throw e;
    throw new WearableError('refresh_failed', (e as Error).message, (e as WearableError).status);
  }
}

export async function revokeAccess(id: OAuthWearableId, accessToken: string): Promise<void> {
  const env = readProviderEnv(id);
  try {
    if (env) await OAUTH_PROVIDERS[id].revoke?.(accessToken, env.apiBase);
  } catch {
    /* best-effort */
  }
}
