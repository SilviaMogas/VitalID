create table public.vital_id_wellness_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('workout', 'supplement')),
  data jsonb not null check (jsonb_typeof(data) = 'object' and char_length(data::text) <= 12000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vital_id_wellness_entries_owner_idx on public.vital_id_wellness_entries(user_id, kind, updated_at desc);
create table public.vital_id_wellness_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  actions integer not null default 0
);
alter table public.vital_id_wellness_entries enable row level security;
alter table public.vital_id_wellness_limits enable row level security;
revoke all on public.vital_id_wellness_entries, public.vital_id_wellness_limits from anon, authenticated;
grant all on public.vital_id_wellness_entries, public.vital_id_wellness_limits to service_role;

create function public.vital_id_wellness(
  p_user_id uuid, p_action text, p_kind text,
  p_id uuid default null, p_data jsonb default null,
  p_updated_at timestamptz default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_result jsonb;
  v_time timestamptz;
  v_id uuid;
  v_count integer;
begin
  if p_user_id is null then return jsonb_build_object('error','unauthenticated','status',401); end if;
  if p_kind is null or p_kind not in ('workout','supplement')
     or p_action is null or p_action not in ('list','create','update','delete') then
    return jsonb_build_object('error','invalid_request','status',400);
  end if;
  if p_action = 'list' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', e.id, 'kind', e.kind, 'data', e.data, 'createdAt', e.created_at, 'updatedAt', e.updated_at
    ) order by e.updated_at desc, e.id desc),'[]'::jsonb) into v_result
    from public.vital_id_wellness_entries e where e.user_id = p_user_id and e.kind = p_kind;
    return jsonb_build_object('entries',v_result);
  end if;
  if p_action in ('create','update') and
     (p_data is null or jsonb_typeof(p_data) <> 'object' or char_length(p_data::text) > 12000) then
    return jsonb_build_object('error','invalid_request','status',400);
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,711));
  insert into public.vital_id_wellness_limits(user_id, window_start, actions) values (p_user_id,now(),1)
  on conflict(user_id) do update set
    actions = case when vital_id_wellness_limits.window_start < now() - interval '1 minute'
      then 1 else vital_id_wellness_limits.actions + 1 end,
    window_start = case when vital_id_wellness_limits.window_start < now() - interval '1 minute'
      then now() else vital_id_wellness_limits.window_start end
  returning actions into v_count;
  if v_count > 30 then return jsonb_build_object('error','rate_limited','status',429); end if;
  if p_action = 'create' then
    select count(*) into v_count from public.vital_id_wellness_entries where user_id = p_user_id and kind = p_kind;
    if v_count >= 100 then return jsonb_build_object('error','entry_limit','status',409); end if;
    insert into public.vital_id_wellness_entries(user_id,kind,data) values(p_user_id,p_kind,p_data)
      returning id,updated_at into v_id,v_time;
  else
    select updated_at into v_time from public.vital_id_wellness_entries
      where id = p_id and user_id = p_user_id and kind = p_kind for update;
    if v_time is null then return jsonb_build_object('error','not_found','status',404); end if;
    if p_updated_at is null or p_updated_at <> v_time then
      return jsonb_build_object('error','conflict','status',409);
    end if;
    if p_action = 'delete' then
      delete from public.vital_id_wellness_entries where id = p_id and user_id = p_user_id and kind = p_kind;
      return jsonb_build_object('ok',true);
    end if;
    update public.vital_id_wellness_entries set data = p_data, updated_at = clock_timestamp()
      where id = p_id and user_id = p_user_id and kind = p_kind returning id,updated_at into v_id,v_time;
  end if;
  return jsonb_build_object('ok',true,'id',v_id,'updatedAt',v_time);
end;
$$;
revoke all on function public.vital_id_wellness(uuid,text,text,uuid,jsonb,timestamptz) from public, anon, authenticated;
grant execute on function public.vital_id_wellness(uuid,text,text,uuid,jsonb,timestamptz) to service_role;
