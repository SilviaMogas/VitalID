import { NextResponse } from "next/server";
import { authUrl, newState, redirectUri, requestOrigin, stateCookie, whoopConfigured, readCookie } from "@/lib/whoop";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const onboarding = new URL(req.url).searchParams.get("journey") === "onboarding";
  if (onboarding && (readCookie(req.headers.get("cookie"),"vitalid_pack_consent") !== "1" || readCookie(req.headers.get("cookie"),"vitalid_pack_whoop") !== "1")) return NextResponse.json({error:"Consent required"},{status:403});
  if (!whoopConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 404 });
  const state = newState();
  const redirect = redirectUri(req);
  const res = NextResponse.redirect(authUrl(state, redirect));
  const secure = requestOrigin(req).startsWith("https");
  res.headers.append("set-cookie", stateCookie(state, secure));
  res.cookies.set("vitalid_whoop_return",onboarding?"onboarding":"signals",{httpOnly:true,sameSite:"lax",secure,path:"/",maxAge:600});
  return res;
}
