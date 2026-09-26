import { NextResponse } from "next/server";
import { getPlaudClient, plaudConfigured } from "@/lib/plaud";

export const dynamic = "force-dynamic";

export async function GET() {
  const client = getPlaudClient();
  if (!client || !plaudConfigured()) {
    return NextResponse.json({ configured: false, recordings: [] });
  }
  try {
    const recordings = await client.listRecordings(20);
    return NextResponse.json({ configured: true, recordings });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "upstream error" }, { status: 502 });
  }
}
