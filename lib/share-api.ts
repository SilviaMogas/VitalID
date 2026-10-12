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
    const target = new URL(req.url);
    const host = req.headers.get("host");
    // NextURL rewrites loopback IPs to localhost; preserve the browser's actual host.
    const expected = target.hostname === "localhost" && host && /^(127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)
      ? new URL(`${target.protocol}//${host}`).origin
      : target.origin;
    return new URL(origin).origin === expected;
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
