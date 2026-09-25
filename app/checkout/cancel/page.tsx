import { CheckoutResult } from "@/components/checkout/CheckoutResult";

export const dynamic = "force-dynamic";

export default function CheckoutCancelPage() {
  return <CheckoutResult status="cancelled" />;
}
