import type { SignalTile } from "./syntheticSignals";

// A small, non-identifying snapshot transcribed from the Circular sample HAR.
// Never commit the HAR, account profile, device identifiers, request headers or tokens.
export const circularDemo = {
  snapshotDate: "2026-09-23",
  sleepMinutes: 441,
  sleepScore: 80,
  previousSleepScore: 93,
  steps: 1603,
  previousSteps: 5942,
  hrvMs: 70,
  restingHeartRate: 47,
} as const;

export const circularDemoTiles: SignalTile[] = [
  { id: "circular-sleep", key: "sleep", value: { en: "7h 21m", ar: "7 س 21 د" }, sub: { en: "Circular sample · 23 Sep", ar: "عينة Circular · ٢٣ سبتمبر" } },
  { id: "circular-rhr", key: "rhr", value: { en: "47 bpm", ar: "47 نبضة/د" }, sub: { en: "Circular sample", ar: "عينة Circular" } },
  { id: "circular-hrv", key: "hrv", value: { en: "70 ms", ar: "70 مللي ثانية" }, sub: { en: "Rounded sample reading", ar: "قراءة نموذجية مقربة" } },
];
