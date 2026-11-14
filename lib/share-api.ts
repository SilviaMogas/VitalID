import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";

export { isSameOrigin, isStrictSameOrigin } from "@/lib/same-origin";

export function shareJson(
  body: unknown,
  status = 200,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function getShareApiUser() {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}
