import { NextRequest, NextResponse } from "next/server";
import { dataRequest, setSessionCookies, verifiedSession } from "@/lib/supabaseServer";
import type { DailyEntry } from "@/lib/daily";

export const dynamic = "force-dynamic";

type DayRow = {
  id: string; entry_date: string; created_at: string;
  mood: DailyEntry["mood"]; energy: DailyEntry["energy"]; note: string;
  movement: string; movement_minutes: number | null; food: string; source: DailyEntry["source"];
};
const noStore = { "Cache-Control": "no-store" };

async function userSession(request: NextRequest) {
  try { return await verifiedSession(request); } catch { return null; }
}

export async function GET(request: NextRequest) {
  const session = await userSession(request);
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401, headers: noStore });
  const id = encodeURIComponent(session.user.id);
  try {
    const profileResponse = await dataRequest(`vitalid_profiles?user_id=eq.${id}&select=display_name,locale`, session.token);
    const daysResponse = await dataRequest(`vitalid_daily_entries?user_id=eq.${id}&select=*&order=entry_date.desc`, session.token);
    if (!profileResponse.ok || !daysResponse.ok) return NextResponse.json({ error: "Account storage needs the Supabase daily_wellness.sql setup." }, { status: 503, headers: noStore });
    const profiles = await profileResponse.json() as Array<{ display_name: string; locale: string }>;
    const rows = await daysResponse.json() as DayRow[];
    const name = profiles[0]?.display_name || session.user.user_metadata?.display_name || session.user.email?.split("@")[0] || "Friend";
    if (!profiles.length) {
      await dataRequest("vitalid_profiles?on_conflict=user_id", session.token, {
        method: "POST", headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ user_id: session.user.id, display_name: name, locale: "en" }),
      });
    }
    const entries: DailyEntry[] = rows.map(row => ({
      id: row.id, date: row.entry_date, createdAt: new Date(row.created_at).getTime(),
      mood: row.mood, energy: row.energy, note: row.note, movement: row.movement,
      movementMinutes: row.movement_minutes, food: row.food, source: row.source,
    }));
    const response = NextResponse.json({ profile: { id: session.user.id, name, isDemo: false, joinedAt: Date.now() }, entries }, { headers: noStore });
    if (session.renewed) setSessionCookies(response, session.renewed);
    return response;
  } catch { return NextResponse.json({ error: "Could not load your account." }, { status: 502, headers: noStore }); }
}

export async function POST(request: NextRequest) {
  const session = await userSession(request);
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401, headers: noStore });
  let entry: DailyEntry;
  try { entry = await request.json(); } catch { return NextResponse.json({ error: "Invalid daily entry." }, { status: 400 }); }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || (entry.mood != null && ![1, 2, 3, 4, 5].includes(entry.mood)) ||
    (entry.energy != null && !["low", "steady", "high"].includes(entry.energy)) ||
    !["manual", "voice", "plaud", "sample"].includes(entry.source) ||
    typeof entry.note !== "string" || entry.note.length > 10000 ||
    typeof entry.food !== "string" || entry.food.length > 2000 ||
    typeof entry.movement !== "string" || entry.movement.length > 500 ||
    (entry.movementMinutes != null && (!Number.isInteger(entry.movementMinutes) || entry.movementMinutes < 0 || entry.movementMinutes > 1440))) {
    return NextResponse.json({ error: "Please check your daily entry." }, { status: 400 });
  }
  const row = {
    user_id: session.user.id, entry_date: entry.date, mood: entry.mood, energy: entry.energy,
    note: entry.note, movement: entry.movement, movement_minutes: entry.movementMinutes,
    food: entry.food, source: entry.source, updated_at: new Date().toISOString(),
  };
  try {
    const upstream = await dataRequest("vitalid_daily_entries?on_conflict=user_id,entry_date", session.token, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(row),
    });
    if (!upstream.ok) return NextResponse.json({ error: "Your entry could not be saved to Supabase. Please try again." }, { status: 503, headers: noStore });
    const rows = await upstream.json() as DayRow[];
    const response = NextResponse.json({ id: rows[0]?.id ?? entry.id }, { headers: noStore });
    if (session.renewed) setSessionCookies(response, session.renewed);
    return response;
  } catch { return NextResponse.json({ error: "Your entry could not be saved to Supabase. Please try again." }, { status: 502, headers: noStore }); }
}
