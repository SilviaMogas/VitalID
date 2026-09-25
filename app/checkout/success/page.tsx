import { CheckoutResult } from "@/components/checkout/CheckoutResult";
import { getCurrentUserKey } from "@/lib/membership/session";
import { verifyAndActivate } from "@/lib/stripe/verify";
import { isStripeConfigured } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;

  if (!sessionId || !isStripeConfigured()) {
    return <CheckoutResult status="failed" reason={!sessionId ? "missing_session" : "stripe_not_configured"} />;
  }

  try {
    const expectedUserKey = await getCurrentUserKey();
    const result = await verifyAndActivate(sessionId, { expectedUserKey });
    if (result.ok) {
      return <CheckoutResult status="activated" plan={result.plan} />;
    }
    return <CheckoutResult status="failed" reason={result.reason} />;
  } catch {
    return <CheckoutResult status="failed" reason="stripe_error" />;
  }
}
