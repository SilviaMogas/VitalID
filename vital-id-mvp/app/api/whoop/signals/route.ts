import { NextResponse } from "next/server";
import {
  clearTokenCookie,
  readTokens,
  requestOrigin,
  tokenCookie,
  WhoopClient,
  WhoopError,
  whoopConfigured,
  readCookie,
  type WhoopSignals,
} from "@/lib/whoop";

export const dynamic = "force-dynamic";

// Dev-only mock: WHOOP_MOCK=1 (never on Vercel) returns a fixture without OAuth.
const MOCK: WhoopSignals = {
  source: "whoop",
  firstName: "Fatima",
  fetchedAt: 0,
  recovery: 74,
  rhr: 58,
  hrv: 62,
  sleepMinutes: 372,
  sleepPerformance: 81,
  spo2: 97.4,
  skinTempC: 33.2,
  respiratoryRate: 14.1,
  week: {
    recovery: [52, 61, 48, 66, 71, 58, 74],
    rhr: [62, 61, 63, 60, 59, 60, 58],
    hrv: [44, 48, 41, 52, 57, 50, 62],
    sleepHours: [5.9, 6.8, 5.4, 6.5, 7.1, 6.1, 6.2],
  },
  sleepStages: { light: 198, deep: 84, rem: 90, awake: 42 },
};

export async function GET(req: Request) {
  if(new URL(req.url).searchParams.get("journey")==="onboarding"&&(readCookie(req.headers.get("cookie"),"vitalid_pack_consent")!=="1"||readCookie(req.headers.get("cookie"),"vitalid_pack_whoop")!=="1"))return NextResponse.json({error:"Consent required"},{status:403});
  if (process.env.WHOOP_MOCK === "1" && !process.env.VERCEL) {
    return NextResponse.json({ configured: true, connected: true, simulated: true, signals: { ...MOCK, fetchedAt: Date.now() } });
  }
  if (!whoopConfigured()) return NextResponse.json({ configured: false, connected: false });

  const tokens = readTokens(req.headers.get("cookie"));
  if (!tokens) return NextResponse.json({ configured: true, connected: false });

  let rotated: typeof tokens | null = null;
  const client = new WhoopClient(tokens, {
    onTokens: (t) => {
      rotated = t;
    },
  });
  try {
    const signals = await client.getSignals();
    const res = NextResponse.json({ configured: true, connected: true, signals });
    if (rotated) {
      res.headers.append("set-cookie", tokenCookie(rotated, requestOrigin(req).startsWith("https")));
    }
    return res;
  } catch (e) {
    if (e instanceof WhoopError && e.code === "auth") {
      const res = NextResponse.json({ configured: true, connected: false });
      res.headers.append("set-cookie", clearTokenCookie());
      return res;
    }
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
