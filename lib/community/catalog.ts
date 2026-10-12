import { CITIES, HOBBIES } from "@/lib/community";

type HobbyId = (typeof HOBBIES)[number];

export type CommunityGroupId = "general" | `hobby:${HobbyId}` | `city:${string}`;

export interface CommunityGroupCatalogEntry {
  id: CommunityGroupId;
  kind: "general" | "hobby" | "city";
  label: {
    key: string;
    params?: Record<string, string>;
  };
}

export const COMMUNITY_GROUP_CATALOG = [
  {
    id: "general",
    kind: "general",
    label: { key: "community.group.general" },
  },
  ...HOBBIES.map((hobby) => ({
    id: `hobby:${hobby}` as `hobby:${HobbyId}`,
    kind: "hobby" as const,
    label: { key: "community.group.hobbyWorld", params: { hobby } },
  })),
  ...CITIES.map(({ id, name }) => ({
    id: `city:${id}` as `city:${string}`,
    kind: "city" as const,
    label: { key: "community.group.city", params: { city: name } },
  })),
] satisfies readonly CommunityGroupCatalogEntry[];

const COMMUNITY_GROUP_IDS = new Set<string>(
  COMMUNITY_GROUP_CATALOG.map((group) => group.id),
);

export function isCommunityGroupId(value: unknown): value is CommunityGroupId {
  return typeof value === "string" && COMMUNITY_GROUP_IDS.has(value);
}
