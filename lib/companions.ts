import type { HealthMetric, MetricKey } from "@/types";

export type CompanionName = "heart" | "muscle" | "dumbbell" | "moon" | "shield";
export type CompanionMood = "idle" | "cheer" | "calm" | "alert";

export const COMPANION_FOR_METRIC: Record<MetricKey, CompanionName> = {
  recovery: "heart",
  restingHeartRate: "heart",
  hrv: "muscle",
  sleep: "moon",
  activity: "dumbbell",
};

function isWorse(m: HealthMetric): boolean {
  return m.polarity === "higherIsBetter" ? m.deltaPercent < 0 : m.deltaPercent > 0;
}

export function companionMood(m: HealthMetric): CompanionMood {
  switch (m.status) {
    case "improving":
      return "cheer";
    case "stable":
      return "calm";
    case "declining":
      return "alert";
    case "unusual":
      return isWorse(m) ? "alert" : "cheer";
  }
}
