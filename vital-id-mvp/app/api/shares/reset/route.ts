import { NextResponse } from "next/server";
import { resetShares } from "@/lib/shareStore";

export const dynamic = "force-dynamic";

export async function POST() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_RESET !== "1") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await resetShares();
  return NextResponse.json({ status: "reset" });
}
