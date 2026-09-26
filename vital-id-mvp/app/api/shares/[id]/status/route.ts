import { NextResponse } from "next/server";
import { getShare } from "@/lib/shareStore";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = new URL(req.url).searchParams.get("t");
  const { status, record } = await getShare(id, token, { countView: false });
  if (status === "not_found" || !record) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    status,
    createdAt: record.createdAt,
    views: record.views ?? [],
    expiresAt: record.expiresAt,
    revokedAt: record.revokedAt,
    recipientLabel: record.recipientLabel,
  });
}
