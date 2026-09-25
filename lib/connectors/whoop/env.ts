import 'server-only';

/**
 * WHOOP connector env wiring. Server-only — the client secret must never
 * reach the browser.
 */

export const WHOOP_SCOPES =
  'read:recovery read:sleep read:cycles read:workout read:profile read:body_measurement offline';

export interface WhoopEnv {
  clientId: string;
  clientSecret: string;
  /** Explicit redirect URI, or null → derived from NEXT_PUBLIC_APP_URL / request origin. */
  redirectUri: string | null;
  oauthBase: string;
  apiBase: string;
}

export function readWhoopEnv(): WhoopEnv | null {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    redirectUri: process.env.WHOOP_REDIRECT_URI ?? null,
    oauthBase: process.env.WHOOP_OAUTH_BASE ?? 'https://api.prod.whoop.com',
    apiBase: process.env.WHOOP_API_BASE ?? 'https://api.prod.whoop.com/developer',
  };
}

export function isWhoopConfigured(): boolean {
  return readWhoopEnv() !== null;
}
