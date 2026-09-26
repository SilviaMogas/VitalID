import { NextResponse } from "next/server";
import { clearTokenCookie, readTokens, WhoopClient, whoopConfigured } from "@/lib/whoop";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (whoopConfigured()) {
    const tokens = readTokens(req.headers.get("cookie"));
    if (tokens) await new WhoopClient(tokens).revoke();
  }
  const res = NextResponse.json({ ok: true });
  res.headers.append("set-cookie", clearTokenCookie());
  return res;
}
