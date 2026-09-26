import { NextRequest, NextResponse } from "next/server";

const accessCookie = "vitalid_sb_access";
const refreshCookie = "vitalid_sb_refresh";

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: { display_name?: string };
}
export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  user: AuthUser;
}

export function supabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") return null;
    return { url: parsed.origin, key };
  } catch { return null; }
}

export async function authRequest(path: string, init: RequestInit = {}) {
  const config = supabaseConfig();
  if (!config) throw new Error("Supabase Auth is not configured.");
  return fetch(config.url + "/auth/v1" + path, {
    ...init,
    headers: { apikey: config.key, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
}

export function setSessionCookies(response: NextResponse, session: AuthSession) {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(accessCookie, session.access_token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: Math.max(60, session.expires_in ?? 3600) });
  response.cookies.set(refreshCookie, session.refresh_token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.delete(accessCookie);
  response.cookies.delete(refreshCookie);
}

export async function verifiedSession(request: NextRequest): Promise<{ user: AuthUser; token: string; renewed?: AuthSession } | null> {
  const access = request.cookies.get(accessCookie)?.value;
  if (access) {
    const result = await authRequest("/user", { headers: { Authorization: `Bearer ${access}` } });
    if (result.ok) return { user: await result.json() as AuthUser, token: access };
  }
  const refresh = request.cookies.get(refreshCookie)?.value;
  if (!refresh) return null;
  const result = await authRequest("/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: refresh }) });
  if (!result.ok) return null;
  const renewed = await result.json() as AuthSession;
  if (!renewed.user?.id || !renewed.access_token || !renewed.refresh_token) return null;
  return { user: renewed.user, token: renewed.access_token, renewed };
}

export async function dataRequest(path: string, token: string, init: RequestInit = {}) {
  const config = supabaseConfig();
  if (!config) throw new Error("Supabase Auth is not configured.");
  return fetch(config.url + "/rest/v1/" + path, {
    ...init,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
}
