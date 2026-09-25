"use client";

import { useState } from "react";
import { Splash } from "@/components/onboarding/Splash";
import { Welcome } from "@/components/onboarding/Welcome";

type Step = "splash" | "leaving" | "welcome";

export function Onboarding({
  onEnter,
  onContinue,
  continueName,
  onAuthLink,
  skipSplash = false,
}: {
  onEnter: () => void;
  onContinue?: () => void;
  continueName?: string;
  onAuthLink?: () => void;
  skipSplash?: boolean;
}) {
  const [step, setStep] = useState<Step>(skipSplash ? "welcome" : "splash");

  return (
    <>
      {step !== "welcome" && (
        <Splash
          onLeaving={() => setStep("leaving")}
          onDone={() => setStep("welcome")}
        />
      )}
      {step !== "splash" && (
        <Welcome onEnter={onEnter} onContinue={onContinue} continueName={continueName} onAuthLink={onAuthLink} />
      )}
    </>
  );
}
