create function public.vital_id_wellness_deletion_metadata(p_user_id uuid, p_kind text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_result jsonb;
begin
  if p_user_id is null then
    return jsonb_build_object('error','unauthenticated','status',401);
  end if;
  if p_kind is null or p_kind not in ('workout','supplement') then
    return jsonb_build_object('error','invalid_request','status',400);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id, 'kind', e.kind, 'createdAt', e.created_at, 'updatedAt', e.updated_at
  ) order by e.updated_at desc, e.id desc), '[]'::jsonb) into v_result
  from (
    select id, kind, created_at, updated_at
    from public.vital_id_wellness_entries
    where user_id = p_user_id and kind = p_kind
    order by updated_at desc, id desc
    limit 100
  ) e;
  return jsonb_build_object('entries',v_result);
end;
$$;
revoke all on function public.vital_id_wellness_deletion_metadata(uuid,text) from public, anon, authenticated;
grant execute on function public.vital_id_wellness_deletion_metadata(uuid,text) to service_role;
