// Server-only WHOOP client (official OAuth + developer API). Credentials never reach the browser.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const API_BASE = "https://api.prod.whoop.com/developer";

export const WHOOP_SCOPES = "read:recovery read:sleep read:cycles read:profile offline";
export const TOKEN_COOKIE = "vitalid_whoop";
export const STATE_COOKIE = "vitalid_whoop_state";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;
const SKEW_MS = 60_000;

export interface WhoopTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface WhoopSignals {
  source: "whoop";
  firstName: string | null;
  fetchedAt: number;
  recovery: number | null;
  rhr: number | null;
  hrv: number | null;
  sleepMinutes: number | null;
  sleepPerformance: number | null;
  spo2: number | null;
  skinTempC: number | null;
  respiratoryRate: number | null;
  week: { recovery: number[]; rhr: number[]; hrv: number[]; sleepHours: number[] };
  sleepStages: { light: number; deep: number; rem: number; awake: number } | null;
}

export class WhoopError extends Error {
  constructor(
    public code: "not_configured" | "auth" | "upstream",
    message: string
  ) {
    super(message);
    this.name = "WhoopError";
  }
}

// ---------- env / config ----------

export function whoopConfigured(): boolean {
  return Boolean(process.env.WHOOP_CLIENT_ID && process.env.WHOOP_CLIENT_SECRET);
}

function cookieSecret(): string {
  const s = process.env.WHOOP_COOKIE_SECRET ?? process.env.WHOOP_CLIENT_SECRET;
  if (!s) throw new WhoopError("not_configured", "no cookie secret");
  return s;
}

function key(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

// ---------- token cookie crypto (AES-256-GCM) ----------

export function encryptTokens(tokens: WhoopTokens, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(tokens), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64url");
}

export function decryptTokens(blob: string, secret: string): WhoopTokens | null {
  try {
    const raw = Buffer.from(blob, "base64url");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ct = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key(secret), iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
    const t = JSON.parse(pt) as WhoopTokens;
    return typeof t.access_token === "string" ? t : null;
  } catch {
    return null;
  }
}

export function readTokens(cookieHeader: string | null): WhoopTokens | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${TOKEN_COOKIE}=([^;]+)`));
  if (!match) return null;
  try {
    return decryptTokens(decodeURIComponent(match[1]), cookieSecret());
  } catch {
    return null;
  }
}

export function tokenCookie(tokens: WhoopTokens, secure: boolean): string {
  const v = encryptTokens(tokens, cookieSecret());
  return `${TOKEN_COOKIE}=${v}; HttpOnly; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function clearTokenCookie(): string {
  return `${TOKEN_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

export function stateCookie(state: string, secure: boolean): string {
  return `${STATE_COOKIE}=${state}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

// ---------- URLs ----------

export function requestOrigin(req: Request): string {
  const proto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (proto && host) return `${proto}://${host}`;
  return new URL(req.url).origin;
}

export function redirectUri(req: Request): string {
  return process.env.WHOOP_REDIRECT_URI ?? `${requestOrigin(req)}/api/whoop/callback`;
}

export function authUrl(state: string, redirect: string): string {
  const p = new URLSearchParams({
    client_id: process.env.WHOOP_CLIENT_ID!,
    redirect_uri: redirect,
    response_type: "code",
    scope: WHOOP_SCOPES,
    state,
  });
  return `${AUTH_URL}?${p.toString()}`;
}

export function newState(): string {
  return randomBytes(16).toString("base64url");
}

// ---------- API client ----------

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

export async function exchangeCode(
  code: string,
  redirect: string,
  fetchImpl: typeof fetch = fetch
): Promise<WhoopTokens> {
  const res = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirect,
      client_id: process.env.WHOOP_CLIENT_ID!,
      client_secret: process.env.WHOOP_CLIENT_SECRET!,
    }).toString(),
  });
  if (!res.ok) throw new WhoopError("auth", `token exchange failed (${res.status})`);
  const d = (await res.json()) as TokenResponse;
  return {
    access_token: d.access_token,
    refresh_token: d.refresh_token ?? "",
    expires_at: Date.now() + (d.expires_in ?? 3600) * 1000,
  };
}

export class WhoopClient {
  constructor(
    private tokens: WhoopTokens,
    private opts?: { fetchImpl?: typeof fetch; onTokens?: (t: WhoopTokens) => void | Promise<void> }
  ) {}

  private get fetchImpl() {
    return this.opts?.fetchImpl ?? fetch;
  }

  private refreshing: Promise<void> | null = null;

  private async refreshOnce(): Promise<void> {
    this.refreshing ??= this.refresh().finally(() => {
      this.refreshing = null;
    });
    await this.refreshing;
  }

  private async ensureFresh(): Promise<void> {
    if (!this.tokens.expires_at || Date.now() <= this.tokens.expires_at - SKEW_MS) return;
    await this.refreshOnce();
  }

  private async refresh(): Promise<void> {
    const res = await this.fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.tokens.refresh_token,
        client_id: process.env.WHOOP_CLIENT_ID!,
        client_secret: process.env.WHOOP_CLIENT_SECRET!,
        scope: "offline",
      }).toString(),
    });
    if (!res.ok) throw new WhoopError("auth", `refresh failed (${res.status})`);
    const d = (await res.json()) as TokenResponse;
    this.tokens = {
      access_token: d.access_token,
      refresh_token: d.refresh_token ?? this.tokens.refresh_token,
      expires_at: Date.now() + (d.expires_in ?? 3600) * 1000,
    };
    await this.opts?.onTokens?.(this.tokens);
  }

  private async api(path: string, retried = false): Promise<unknown> {
    await this.ensureFresh();
    const res = await this.fetchImpl(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${this.tokens.access_token}` },
    });
    if (res.status === 401 && !retried) {
      await this.refreshOnce();
      return this.api(path, true);
    }
    if (res.status === 401) throw new WhoopError("auth", "unauthorized after refresh");
    if (!res.ok) throw new WhoopError("upstream", `WHOOP API ${res.status} for ${path}`);
    return res.json();
  }

  async revoke(): Promise<void> {
    try {
      await this.fetchImpl(`${API_BASE}/v2/user/access`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${this.tokens.access_token}` },
      });
    } catch {
      // best-effort revoke
    }
  }

  async getSignals(): Promise<WhoopSignals> {
    const [profile, recovery, sleep] = (await Promise.all([
      this.api("/v2/user/profile/basic").catch(() => null),
      this.api("/v2/recovery?limit=7"),
      this.api("/v2/activity/sleep?limit=10"),
    ])) as [unknown, unknown, unknown];

    const p = profile as { first_name?: string } | null;
    const recs = ((recovery as { records?: unknown[] })?.records ?? []) as RecoveryRec[];
    const sleeps = ((sleep as { records?: unknown[] })?.records ?? []) as SleepRec[];

    const scoredRec = recs.filter((r) => r.score_state === "SCORED" && r.score);
    const scoredSleep = sleeps.filter((s) => s.score_state === "SCORED" && s.score && !s.nap);

    const latest = scoredRec[0];
    const latestSleep = scoredSleep[0];

    const weekRec = scoredRec.slice(0, 7).reverse();
    const weekSleep = scoredSleep.slice(0, 7).reverse();

    const sig: WhoopSignals = {
      source: "whoop",
      firstName: p?.first_name ?? null,
      fetchedAt: Date.now(),
      recovery: latest?.score?.recovery_score != null ? Math.round(latest.score.recovery_score) : null,
      rhr: latest?.score?.resting_heart_rate != null ? Math.round(latest.score.resting_heart_rate) : null,
      hrv: latest?.score?.hrv_rmssd_milli != null ? Math.round(latest.score.hrv_rmssd_milli) : null,
      sleepMinutes: latestSleep?.score?.stage_summary
        ? Math.round(
            (latestSleep.score.stage_summary.total_in_bed_time_milli -
              latestSleep.score.stage_summary.total_awake_time_milli) /
              60000
          )
        : null,
      sleepPerformance:
        latestSleep?.score?.sleep_performance_percentage != null
          ? Math.round(latestSleep.score.sleep_performance_percentage)
          : null,
      spo2: latest?.score?.spo2_percentage != null ? Math.round(latest.score.spo2_percentage * 10) / 10 : null,
      skinTempC: latest?.score?.skin_temp_celsius != null ? Math.round(latest.score.skin_temp_celsius * 10) / 10 : null,
      respiratoryRate:
        latestSleep?.score?.respiratory_rate != null ? Math.round(latestSleep.score.respiratory_rate * 10) / 10 : null,
      week: {
        recovery: weekRec.map((r) => Math.round(r.score!.recovery_score ?? 0)),
        rhr: weekRec.map((r) => Math.round(r.score!.resting_heart_rate ?? 0)),
        hrv: weekRec.map((r) => Math.round(r.score!.hrv_rmssd_milli ?? 0)),
        sleepHours: weekSleep.map((s) =>
          Math.round(
            ((s.score!.stage_summary.total_in_bed_time_milli - s.score!.stage_summary.total_awake_time_milli) / 3600000) *
              10
          ) / 10
        ),
      },
      sleepStages: latestSleep?.score?.stage_summary
        ? {
            light: Math.round(latestSleep.score.stage_summary.total_light_sleep_time_milli / 60000),
            deep: Math.round(latestSleep.score.stage_summary.total_slow_wave_sleep_time_milli / 60000),
            rem: Math.round(latestSleep.score.stage_summary.total_rem_sleep_time_milli / 60000),
            awake: Math.round(latestSleep.score.stage_summary.total_awake_time_milli / 60000),
          }
        : null,
    };
    return sig;
  }
}

interface RecoveryRec {
  score_state?: string;
  score?: {
    recovery_score?: number;
    resting_heart_rate?: number;
    hrv_rmssd_milli?: number;
    spo2_percentage?: number;
    skin_temp_celsius?: number;
  };
}

interface SleepRec {
  nap?: boolean;
  score_state?: string;
  score?: {
    sleep_performance_percentage?: number;
    respiratory_rate?: number;
    stage_summary: {
      total_in_bed_time_milli: number;
      total_awake_time_milli: number;
      total_light_sleep_time_milli: number;
      total_slow_wave_sleep_time_milli: number;
      total_rem_sleep_time_milli: number;
    };
  };
}
