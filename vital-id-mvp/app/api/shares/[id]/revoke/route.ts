import { NextResponse } from "next/server";
import { revokeShare } from "@/lib/shareStore";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let token: string | null = null;
  try {
    const body = await req.json();
    token = typeof body?.token === "string" ? body.token : null;
  } catch {
    token = null;
  }
  const { status } = await revokeShare(id, token);
  if (status === "not_found") return NextResponse.json({ status: "not_found" }, { status: 404 });
  return NextResponse.json({ status: "revoked" });
}
