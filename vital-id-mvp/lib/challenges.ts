import type { Lang } from "./i18n";

export interface WellnessChallenge {
  id: "water" | "stretch" | "walk" | "connect";
  icon: string;
  title: Record<Lang, string>;
  description: Record<Lang, string>;
}

export const wellnessChallenges: WellnessChallenge[] = [
  {
    id: "water",
    icon: "💧",
    title: { ar: "استراحة ماء", en: "Water break" },
    description: { ar: "اشرب كوباً من الماء على مهل.", en: "Slow down and enjoy a glass of water." },
  },
  {
    id: "stretch",
    icon: "🙆",
    title: { ar: "دقيقتان من الحركة", en: "Two-minute reset" },
    description: { ar: "حرّك كتفيك وتمدد بلطف إذا كان ذلك مريحاً لك.", en: "Roll your shoulders and stretch gently if that feels comfortable." },
  },
  {
    id: "walk",
    icon: "🚶",
    title: { ar: "نزهة قصيرة", en: "A short walk" },
    description: { ar: "امشِ عشر دقائق بوتيرة مريحة إذا كان ذلك مناسباً لك.", en: "Take a ten-minute walk at an easy pace if that suits you." },
  },
  {
    id: "connect",
    icon: "💛",
    title: { ar: "لحظة تواصل", en: "A moment of connection" },
    description: { ar: "أرسل تحية قصيرة إلى شخص تحب التواصل معه.", en: "Send a quick hello to someone you would enjoy hearing from." },
  },
];

export function challengeIndexForDate(dateKey: string): number {
  return [...dateKey].reduce((total, char) => total + char.charCodeAt(0), 0) % wellnessChallenges.length;
}

export function nextChallengeIndex(index: number): number {
  return (index + 1) % wellnessChallenges.length;
}
