import { Suspense } from "react";
import { PricingView } from "@/components/pricing/PricingView";

export const dynamic = "force-dynamic";

export default function PricingPage() {
  return (
    <Suspense>
      <PricingView />
    </Suspense>
  );
}
