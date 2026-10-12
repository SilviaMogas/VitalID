import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type CommunityAction =
  | "groups"
  | "feed"
  | "comments"
  | "join"
  | "leave"
  | "post"
  | "comment"
  | "delete_post"
  | "delete_comment"
  | "report_post"
  | "report_comment";

export interface CommunityStoreInput {
  userId: string;
  action: CommunityAction;
  groupId?: string | null;
  entityId?: string | null;
  body?: string | null;
  alias?: string | null;
  before?: string | null;
  beforeId?: string | null;
}

export async function callCommunityStore(input: CommunityStoreInput): Promise<unknown> {
  const { data, error } = await getSupabaseServerClient().rpc("vital_id_community", {
    p_user_id: input.userId,
    p_action: input.action,
    p_group_id: input.groupId ?? null,
    p_entity_id: input.entityId ?? null,
    p_body: input.body ?? null,
    p_alias: input.alias ?? null,
    p_before: input.before ?? null,
    p_before_id: input.beforeId ?? null,
  });
  if (error) throw new Error("community store unavailable");
  return data;
}
