import { NextResponse } from "next/server";
import { exchangeCode, readCookie, redirectUri, requestOrigin, STATE_COOKIE, tokenCookie, whoopConfigured } from "@/lib/whoop";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = requestOrigin(req);
  const destination = readCookie(req.headers.get("cookie"),"vitalid_whoop_return") === "onboarding" ? "onboarding" : "signals";
  const fail = () => NextResponse.redirect(`${origin}/${destination}?whoop=error`);

  if (!whoopConfigured()) return fail();
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = readCookie(req.headers.get("cookie"), STATE_COOKIE);
  if (!code || !state || !cookieState || state !== cookieState) return fail();

  try {
    const tokens = await exchangeCode(code, redirectUri(req));
    const res = NextResponse.redirect(`${origin}/${destination}?whoop=connected`);
    res.headers.append("set-cookie", tokenCookie(tokens, origin.startsWith("https")));
    res.headers.append("set-cookie", `${STATE_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
    return res;
  } catch {
    return fail();
  }
}
