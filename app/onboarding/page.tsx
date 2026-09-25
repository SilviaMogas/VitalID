import { Suspense } from "react";
import { SetupWizard } from "@/components/onboarding/setup/SetupWizard";

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-[60dvh]" aria-busy />}>
      <SetupWizard />
    </Suspense>
  );
}
