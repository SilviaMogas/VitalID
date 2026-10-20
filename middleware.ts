import { NextResponse, type NextRequest } from "next/server";

// Rolls an expired member access token over before any server component or
// route handler reads it, so an idle member is never resolved as the
// unauthenticated (Fatima demo) request.

const ACCESS_COOKIE = "vitalid_at";
const REFRESH_COOKIE = "vitalid_rt";
const YEAR = 60 * 60 * 24 * 365;
const REFRESH_SKEW_SECONDS = 60;

function accessTokenExpiry(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp : null;
  } catch {
    return null;
  }
}

function needsRefresh(accessToken: string | undefined): boolean {
  if (!accessToken) return true;
  const exp = accessTokenExpiry(accessToken);
  if (exp === null) return true;
  return exp - Date.now() / 1000 < REFRESH_SKEW_SECONDS;
}

async function refreshTokens(
  refreshToken: string,
): Promise<{ access_token: string; refresh_token: string } | null> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !apiKey) return null;
  try {
    const res = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: apiKey },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string; refresh_token?: string };
    if (!data.access_token || !data.refresh_token) return null;
    return { access_token: data.access_token, refresh_token: data.refresh_token };
  } catch {
    return null;
  }
}

function cookieOpts(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function middleware(request: NextRequest) {
  const at = request.cookies.get(ACCESS_COOKIE)?.value;
  const rt = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!rt || !needsRefresh(at)) return NextResponse.next();

  const refreshed = await refreshTokens(rt);
  if (!refreshed) {
    // Dead session: drop the cookies so downstream code sees a signed-out
    // request instead of a member with an unusable token.
    request.cookies.delete(ACCESS_COOKIE);
    request.cookies.delete(REFRESH_COOKIE);
    const response = NextResponse.next({ request });
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    return response;
  }

  request.cookies.set(ACCESS_COOKIE, refreshed.access_token);
  request.cookies.set(REFRESH_COOKIE, refreshed.refresh_token);
  const response = NextResponse.next({ request });
  response.cookies.set(ACCESS_COOKIE, refreshed.access_token, cookieOpts(YEAR));
  response.cookies.set(REFRESH_COOKIE, refreshed.refresh_token, cookieOpts(YEAR));
  return response;
}

export const config = {
  matcher: ["/((?!api/mcp/discovery(?:/|$)|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|demo/|companions/|brand/).*)"],
};
