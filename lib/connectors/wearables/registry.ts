import 'server-only';
import type { OAuthWearableId } from './types';

/**
 * OAuth wearable provider configs (server-only). Endpoints follow each
 * provider's public developer docs at the time of writing — verify before
 * going live; every base URL can be overridden for local mocks.
 */

export interface OAuthProviderConfig {
  id: OAuthWearableId;
  name: string;
  envPrefix: string;
  authorizeUrl: string;
  tokenUrl: string;
  apiBase: string;
  scopes: string;
  scopeSeparator: ' ' | ',';
  extraAuthorizeParams?: Record<string, string>;
  /** Best-effort revoke call. */
  revoke?: (accessToken: string, apiBase: string) => Promise<void>;
}

export const OAUTH_PROVIDERS: Record<OAuthWearableId, OAuthProviderConfig> = {
  oura: {
    id: 'oura',
    name: 'Oura',
    envPrefix: 'OURA',
    authorizeUrl: 'https://cloud.ouraring.com/oauth/authorize',
    tokenUrl: 'https://api.ouraring.com/oauth/token',
    apiBase: 'https://api.ouraring.com',
    scopes: 'daily heartrate workout personal',
    scopeSeparator: ' ',
  },
  strava: {
    id: 'strava',
    name: 'Strava',
    envPrefix: 'STRAVA',
    authorizeUrl: 'https://www.strava.com/oauth/authorize',
    tokenUrl: 'https://www.strava.com/oauth/token',
    apiBase: 'https://www.strava.com/api/v3',
    scopes: 'read,activity:read_all',
    scopeSeparator: ',',
    extraAuthorizeParams: { approval_prompt: 'auto' },
    revoke: async (accessToken) => {
      await fetch('https://www.strava.com/oauth/deauthorize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    },
  },
};

export interface ProviderEnv {
  clientId: string;
  clientSecret: string;
  redirectUri: string | null;
  authorizeUrl: string;
  tokenUrl: string;
  apiBase: string;
}

export function readProviderEnv(id: OAuthWearableId): ProviderEnv | null {
  const cfg = OAUTH_PROVIDERS[id];
  const p = cfg.envPrefix;
  const clientId = process.env[`${p}_CLIENT_ID`];
  const clientSecret = process.env[`${p}_CLIENT_SECRET`];
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    redirectUri: process.env[`${p}_REDIRECT_URI`] ?? null,
    authorizeUrl: process.env[`${p}_AUTHORIZE_URL`] ?? cfg.authorizeUrl,
    tokenUrl: process.env[`${p}_TOKEN_URL`] ?? cfg.tokenUrl,
    apiBase: process.env[`${p}_API_BASE`] ?? cfg.apiBase,
  };
}

export const isProviderConfigured = (id: OAuthWearableId) => readProviderEnv(id) !== null;
