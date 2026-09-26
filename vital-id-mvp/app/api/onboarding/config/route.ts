import { NextResponse } from "next/server";
import { whoopConfigured } from "@/lib/whoop";
import { backendName } from "@/lib/shareBackend";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({whoopConfigured:whoopConfigured(),persistentShares:backendName() !== "file" || !process.env.VERCEL},{headers:{"Cache-Control":"no-store"}});
}
