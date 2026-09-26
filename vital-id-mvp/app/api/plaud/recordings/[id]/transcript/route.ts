import { NextResponse } from "next/server";
import { getPlaudClient } from "@/lib/plaud";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = getPlaudClient();
  if (!client) {
    return NextResponse.json({ error: "not_configured" }, { status: 404 });
  }
  const { id } = await params;
  try {
    const result = await client.getTranscript(id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "upstream error" }, { status: 502 });
  }
}
