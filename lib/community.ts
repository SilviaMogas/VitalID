import type { GoalId } from "@/lib/onboarding/types";

export const HOBBIES = [
  "fitness",
  "hiking",
  "photography",
  "cooking",
  "music",
  "art",
  "travel",
  "reading",
  "yoga",
  "cycling",
  "running",
  "swimming",
] as const;
export type HobbyId = (typeof HOBBIES)[number];

export function isHobbyId(v: unknown): v is HobbyId {
  return typeof v === "string" && (HOBBIES as readonly string[]).includes(v);
}

export interface City {
  id: string;
  name: string;
  country: string;
  members: number;
  /** Tailwind background gradient classes. */
  gradient: string;
  emoji: string;
}

export const CITIES: City[] = [
  { id: "dubai", name: "Dubai", country: "AE", members: 8400, gradient: "from-amber-200 to-orange-300", emoji: "🌆" },
  { id: "abu-dhabi", name: "Abu Dhabi", country: "AE", members: 5100, gradient: "from-sky-200 to-indigo-300", emoji: "🕌" },
  { id: "riyadh", name: "Riyadh", country: "SA", members: 4700, gradient: "from-lime-200 to-emerald-300", emoji: "🌴" },
  { id: "new-york", name: "New York", country: "US", members: 7200, gradient: "from-slate-200 to-blue-300", emoji: "🗽" },
  { id: "london", name: "London", country: "GB", members: 6800, gradient: "from-indigo-200 to-violet-300", emoji: "🎡" },
  { id: "barcelona", name: "Barcelona", country: "ES", members: 3900, gradient: "from-rose-200 to-amber-300", emoji: "🏖️" },
  { id: "toronto", name: "Toronto", country: "CA", members: 3400, gradient: "from-cyan-200 to-sky-300", emoji: "🍁" },
  { id: "sydney", name: "Sydney", country: "AU", members: 3100, gradient: "from-teal-200 to-cyan-300", emoji: "🌊" },
  { id: "tokyo", name: "Tokyo", country: "JP", members: 5600, gradient: "from-pink-200 to-rose-300", emoji: "🗼" },
  { id: "paris", name: "Paris", country: "FR", members: 4400, gradient: "from-violet-200 to-fuchsia-300", emoji: "🗼" },
  { id: "berlin", name: "Berlin", country: "DE", members: 2900, gradient: "from-emerald-200 to-teal-300", emoji: "🐻" },
  { id: "singapore", name: "Singapore", country: "SG", members: 2600, gradient: "from-green-200 to-lime-300", emoji: "🌺" },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function hobbyMembers(id: HobbyId): number {
  return 300 + (hash(`hobby:${id}`) % 4701);
}

export function matchCity(name: string): City | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  return CITIES.find((c) => c.name.toLowerCase() === q);
}

export type GroupKind = "goal" | "hobby" | "city";

export interface Group {
  id: string;
  /** i18n key for the group name. */
  nameKey: string;
  params: Record<string, string | number>;
  members: number;
  kind: GroupKind;
}

export function suggestedGroups(goals: GoalId[], hobbies: HobbyId[], city?: City): Group[] {
  const groups: Group[] = [];
  for (const goal of goals) {
    groups.push({
      id: `goal:${goal}`,
      nameKey: "community.group.goal",
      params: { goal },
      members: 400 + (hash(`goal:${goal}`) % 3200),
      kind: "goal",
    });
  }
  for (const hobby of hobbies) {
    groups.push({
      id: `hobby:${hobby}:${city?.id ?? "world"}`,
      nameKey: city ? "community.group.hobby" : "community.group.hobbyWorld",
      params: city ? { hobby, city: city.name } : { hobby },
      members: hobbyMembers(hobby),
      kind: "hobby",
    });
  }
  if (city) {
    groups.push({
      id: `city:${city.id}`,
      nameKey: "community.group.city",
      params: { city: city.name },
      members: city.members,
      kind: "city",
    });
  }
  return groups;
}
