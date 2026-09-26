import { NextRequest, NextResponse } from "next/server";
import { authRequest, clearSessionCookies, setSessionCookies, supabaseConfig, verifiedSession, type AuthSession } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!supabaseConfig()) return NextResponse.json({ configured: false, user: null }, { headers: { "Cache-Control": "no-store" } });
  try {
    const session = await verifiedSession(request);
    const response = NextResponse.json({ configured: true, user: session?.user ?? null }, { headers: { "Cache-Control": "no-store" } });
    if (session?.renewed) setSessionCookies(response, session.renewed);
    return response;
  } catch { return NextResponse.json({ configured: true, user: null }, { status: 502 }); }
}

export async function POST(request: NextRequest) {
  let body: Partial<AuthSession>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!body.access_token || !body.refresh_token) return NextResponse.json({ error: "Missing session." }, { status: 400 });
  try {
    const upstream = await authRequest("/user", { headers: { Authorization: `Bearer ${body.access_token}` } });
    if (!upstream.ok) return NextResponse.json({ error: "Confirmation link expired or invalid." }, { status: 401 });
    const user = await upstream.json();
    const response = NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
    setSessionCookies(response, { access_token: body.access_token, refresh_token: body.refresh_token, expires_in: body.expires_in, user });
    return response;
  } catch { return NextResponse.json({ error: "Could not verify the account." }, { status: 502 }); }
}

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get("vitalid_sb_access")?.value;
  if (token && supabaseConfig()) {
    try { await authRequest("/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }); } catch { /* Clear local session regardless. */ }
  }
  const response = NextResponse.json({ signedOut: true }, { headers: { "Cache-Control": "no-store" } });
  clearSessionCookies(response);
  return response;
}
