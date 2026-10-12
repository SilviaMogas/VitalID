import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";

export function shareJson(
  body: unknown,
  status = 200,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(req.url).origin;
  } catch {
    return false;
  }
}

export async function getShareApiUser() {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}
