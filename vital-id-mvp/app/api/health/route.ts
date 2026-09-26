import { NextResponse } from "next/server";
import { backendName } from "@/lib/shareBackend";
import { plaudConfigured } from "@/lib/plaud";
import { whoopConfigured } from "@/lib/whoop";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, store: backendName(), plaud: plaudConfigured(), whoop: whoopConfigured() });
}
