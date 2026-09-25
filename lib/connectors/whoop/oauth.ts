import 'server-only';
import { readWhoopEnv, WHOOP_SCOPES } from './env';

/**
 * WHOOP OAuth 2.0 helpers (server-only).
 *
 * WHOOP rotates refresh tokens on every refresh — callers must persist the
 * new token pair immediately (see client.ts).
 */

export type WhoopErrorCode =
  | 'not_configured'
  | 'oauth_failed'
  | 'refresh_failed'
  | 'unavailable'
  | 'unauthorized';

export class WhoopError extends Error {
  code: WhoopErrorCode;
  status?: number;
  constructor(code: WhoopErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'WhoopError';
    this.code = code;
    this.status = status;
  }
}

export interface WhoopTokens {
  accessToken: string;
  refreshToken: string;
  /** ISO datetime when the access token expires. */
  expiresAt: string;
  scope: string | null;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

export function buildAuthorizeUrl(state: string, redirectUri: string): string {
  const env = readWhoopEnv();
  if (!env) throw new WhoopError('not_configured', 'WHOOP is not configured');
  const url = new URL(`${env.oauthBase}/oauth/oauth2/auth`);
  url.searchParams.set('client_id', env.clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', WHOOP_SCOPES);
  url.searchParams.set('state', state);
  return url.toString();
}

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const env = readWhoopEnv();
  if (!env) throw new WhoopError('not_configured', 'WHOOP is not configured');
  const body = new URLSearchParams({
    ...params,
    client_id: env.clientId,
    client_secret: env.clientSecret,
  });
  let res: Response;
  try {
    res = await fetch(`${env.oauthBase}/oauth/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch (e) {
    throw new WhoopError('unavailable', `WHOOP token endpoint unreachable: ${(e as Error).message}`);
  }
  if (!res.ok) {
    throw new WhoopError('oauth_failed', `WHOOP token request failed (${res.status})`, res.status);
  }
  return (await res.json()) as TokenResponse;
}

function toTokens(raw: TokenResponse, previousRefresh?: string): WhoopTokens {
  if (!raw.access_token) throw new WhoopError('oauth_failed', 'WHOOP token response missing access_token');
  const refreshToken = raw.refresh_token ?? previousRefresh;
  if (!refreshToken) throw new WhoopError('oauth_failed', 'WHOOP token response missing refresh_token');
  return {
    accessToken: raw.access_token,
    refreshToken,
    expiresAt: new Date(Date.now() + (raw.expires_in ?? 3600) * 1000).toISOString(),
    scope: raw.scope ?? null,
  };
}

export async function exchangeCode(code: string, redirectUri: string): Promise<WhoopTokens> {
  const raw = await tokenRequest({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });
  return toTokens(raw);
}

export async function refreshTokens(refreshToken: string): Promise<WhoopTokens> {
  try {
    const raw = await tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: 'offline',
    });
    return toTokens(raw, refreshToken);
  } catch (e) {
    if (e instanceof WhoopError && e.code === 'not_configured') throw e;
    throw new WhoopError(
      'refresh_failed',
      e instanceof WhoopError ? e.message : `WHOOP refresh failed: ${(e as Error).message}`,
      e instanceof WhoopError ? e.status : undefined,
    );
  }
}

/** Best-effort revocation — never throws. */
export async function revokeAccess(accessToken: string): Promise<void> {
  const env = readWhoopEnv();
  if (!env) return;
  try {
    await fetch(`${env.apiBase}/v2/user/access`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    /* revocation is best-effort */
  }
}
