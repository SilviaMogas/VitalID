import { Suspense } from "react";
import type { Metadata } from "next";
import { PricingView } from "@/components/pricing/PricingView";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Vital ID membership tiers: Free, Plus and Pro.",
  alternates: { canonical: "/pricing" },
};

export const dynamic = "force-dynamic";

export default function PricingPage() {
  return (
    <Suspense>
      <PricingView />
    </Suspense>
  );
}
