import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { WellnessData, WellnessKind } from "@/lib/wellness/types";

export type WellnessAction = "list" | "create" | "update" | "delete";

export interface WellnessStoreInput {
  userId: string;
  action: WellnessAction;
  kind: WellnessKind;
  id?: string | null;
  data?: WellnessData | null;
  updatedAt?: string | null;
}

export async function callWellnessStore(input: WellnessStoreInput): Promise<unknown> {
  const { data, error } = await getSupabaseServerClient().rpc("vital_id_wellness", {
    p_user_id: input.userId,
    p_action: input.action,
    p_kind: input.kind,
    p_id: input.id ?? null,
    p_data: input.data ?? null,
    p_updated_at: input.updatedAt ?? null,
  });
  if (error) throw new Error("wellness store unavailable");
  return data;
}
