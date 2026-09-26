import type { TranslationKey } from "@/lib/i18n";

export type ChallengeId = "water" | "stretch" | "walk" | "connect";

export interface WellnessChallenge {
  id: ChallengeId;
  icon: string;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}

export const WELLNESS_CHALLENGES: WellnessChallenge[] = [
  { id: "water", icon: "💧", titleKey: "challenge.water.title", bodyKey: "challenge.water.body" },
  { id: "stretch", icon: "🙆", titleKey: "challenge.stretch.title", bodyKey: "challenge.stretch.body" },
  { id: "walk", icon: "🚶", titleKey: "challenge.walk.title", bodyKey: "challenge.walk.body" },
  { id: "connect", icon: "💛", titleKey: "challenge.connect.title", bodyKey: "challenge.connect.body" },
];

/** Deterministic pick so everyone sees the same "challenge of the day". */
export function challengeIndexForDate(dateKey: string): number {
  return [...dateKey].reduce((total, char) => total + char.charCodeAt(0), 0) % WELLNESS_CHALLENGES.length;
}

export function nextChallengeIndex(index: number): number {
  return (index + 1) % WELLNESS_CHALLENGES.length;
}

export function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  return `${y}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
