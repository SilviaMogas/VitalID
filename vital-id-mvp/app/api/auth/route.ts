import { NextRequest, NextResponse } from "next/server";
import { authRequest, setSessionCookies, supabaseConfig, type AuthSession } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!supabaseConfig()) return NextResponse.json({ error: "Supabase Auth needs its project URL and publishable key." }, { status: 503 });
  let body: { mode?: string; email?: string; password?: string; name?: string; essentialConsent?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!body || body.essentialConsent !== true) return NextResponse.json({ error: "Essential account consent required." }, { status: 403 });
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  if (!["login", "signup"].includes(body.mode ?? "") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6 || password.length > 128) {
    return NextResponse.json({ error: "Enter a valid email and a password of at least six characters." }, { status: 400 });
  }
  const name = body.name?.trim().slice(0, 80) || email.split("@")[0];
  const url = body.mode === "signup" ? "/signup" : "/token?grant_type=password";
  const payload = body.mode === "signup"
    ? { email, password, data: { display_name: name } }
    : { email, password };
  try {
    const confirmUrl = new URL("/auth/callback", request.nextUrl.origin).toString();
    const upstream = await authRequest(url + (body.mode === "signup" ? `?redirect_to=${encodeURIComponent(confirmUrl)}` : ""), { method: "POST", body: JSON.stringify(payload) });
    const data = await upstream.json() as AuthSession & { msg?: string; error_description?: string; message?: string; error?: string };
    if (!upstream.ok) return NextResponse.json({ error: data.msg || data.error_description || data.message || "Authentication failed." }, { status: upstream.status === 429 ? 429 : 400 });
    if (!data.access_token || !data.refresh_token) {
      return NextResponse.json({ confirmationRequired: true, message: "Check your email to confirm your account, then sign in." }, { headers: { "Cache-Control": "no-store" } });
    }
    const response = NextResponse.json({ user: data.user }, { headers: { "Cache-Control": "no-store" } });
    setSessionCookies(response, data);
    return response;
  } catch {
    return NextResponse.json({ error: "Could not reach Supabase Auth. Please try again." }, { status: 502 });
  }
}
