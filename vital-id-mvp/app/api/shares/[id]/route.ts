import { NextResponse } from "next/server";
import { getShare } from "@/lib/shareStore";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = new URL(req.url).searchParams.get("t");
  const { status, record } = await getShare(id, token, { countView: false });
  if (status === "not_found") return NextResponse.json({ status: "not_found" }, { status: 404 });
  if (status === "revoked") return NextResponse.json({ status: "revoked" }, { status: 403 });
  if (status === "expired") return NextResponse.json({ status: "expired" }, { status: 410 });
  return NextResponse.json(
    { status: "active", recipientLabel: record!.recipientLabel, fields: Object.fromEntries(Object.entries(record!.fields).filter(([key]) => key !== "pack:owner")), expiresAt: record!.expiresAt },
    { status: 200 }
  );
}
