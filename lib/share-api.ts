import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { getConsentStore, hasCurrentHealthConsent } from "@/lib/consent";

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

export async function requireHealthConsent(userId: string): Promise<Response | null> {
  try {
    return hasCurrentHealthConsent(await getConsentStore().latest(userId))
      ? null
      : shareJson({ error: "consent_required" }, 403);
  } catch {
    return shareJson({ error: "unavailable" }, 503);
  }
}

export async function getShareApiUser() {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

export async function getConsentingShareUser(): Promise<
  | { user: NonNullable<Awaited<ReturnType<typeof getShareApiUser>>> }
  | { response: Response }
> {
  const user = await getShareApiUser();
  if (!user) return { response: shareJson({ error: "unavailable" }, 401) };
  const response = await requireHealthConsent(user.id);
  return response ? { response } : { user };
}
