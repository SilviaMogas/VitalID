-- Member-only community. All access goes through authenticated server routes.
create table public.vital_id_community_groups (
  id text primary key
);
insert into public.vital_id_community_groups (id) values
('general'), ('hobby:fitness'), ('hobby:hiking'), ('hobby:photography'),
('hobby:cooking'), ('hobby:music'), ('hobby:art'), ('hobby:travel'),
('hobby:reading'), ('hobby:yoga'), ('hobby:cycling'), ('hobby:running'),
('hobby:swimming'), ('city:dubai'), ('city:abu-dhabi'), ('city:riyadh'),
('city:new-york'), ('city:london'), ('city:barcelona'), ('city:toronto'),
('city:sydney'), ('city:tokyo'), ('city:paris'), ('city:berlin'), ('city:singapore');

create table public.vital_id_community_members (
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id text not null references public.vital_id_community_groups(id),
  alias text not null check (char_length(btrim(alias)) between 2 and 40),
  rules_version text not null default '2026-10-12',
  joined_at timestamptz not null default now(),
  primary key (user_id, group_id)
);
create index vital_id_community_members_group_idx on public.vital_id_community_members(group_id);

create table public.vital_id_community_posts (
  id uuid primary key default gen_random_uuid(),
  group_id text not null references public.vital_id_community_groups(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  alias text not null check (char_length(alias) between 2 and 40),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index vital_id_community_posts_feed_idx on public.vital_id_community_posts(group_id, created_at desc, id desc);

create table public.vital_id_community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.vital_id_community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  alias text not null check (char_length(alias) between 2 and 40),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index vital_id_community_comments_post_idx on public.vital_id_community_comments(post_id, created_at, id);

create table public.vital_id_community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.vital_id_community_posts(id) on delete cascade,
  comment_id uuid references public.vital_id_community_comments(id) on delete cascade,
  reason text not null check (reason in ('spam', 'unsafe', 'privacy', 'other')),
  created_at timestamptz not null default now(),
  check ((post_id is null) <> (comment_id is null)),
  unique (reporter_id, post_id),
  unique (reporter_id, comment_id)
);
create table public.vital_id_community_actions (
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index vital_id_community_actions_user_idx on public.vital_id_community_actions(user_id, created_at);

alter table public.vital_id_community_groups enable row level security;
alter table public.vital_id_community_members enable row level security;
alter table public.vital_id_community_posts enable row level security;
alter table public.vital_id_community_comments enable row level security;
alter table public.vital_id_community_reports enable row level security;
alter table public.vital_id_community_actions enable row level security;
revoke all on public.vital_id_community_groups, public.vital_id_community_members,
  public.vital_id_community_posts, public.vital_id_community_comments,
  public.vital_id_community_reports, public.vital_id_community_actions from anon, authenticated;
grant all on public.vital_id_community_groups, public.vital_id_community_members,
  public.vital_id_community_posts, public.vital_id_community_comments,
  public.vital_id_community_reports, public.vital_id_community_actions to service_role;

create function public.vital_id_community(
  p_user_id uuid, p_action text, p_group_id text default null,
  p_entity_id uuid default null, p_body text default null,
  p_alias text default null, p_before timestamptz default null,
  p_before_id uuid default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_alias text;
  v_group text;
  v_id uuid;
  v_result jsonb;
  v_count integer;
begin
  if p_user_id is null then
    return jsonb_build_object('error', 'unauthenticated', 'status', 401);
  end if;
  if p_action = 'groups' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', g.id,
      'members', (select count(*) from public.vital_id_community_members m where m.group_id = g.id),
      'joined', me.user_id is not null,
      'alias', me.alias
    ) order by g.id), '[]'::jsonb) into v_result
    from public.vital_id_community_groups g
    left join public.vital_id_community_members me on me.group_id = g.id and me.user_id = p_user_id;
    return jsonb_build_object('groups', v_result);
  end if;

  if p_action is null or p_action not in ('feed', 'comments', 'join', 'leave', 'post', 'comment',
                      'delete_post', 'delete_comment', 'report_post', 'report_comment') then
    return jsonb_build_object('error', 'invalid_request', 'status', 400);
  end if;
  if not exists (select 1 from public.vital_id_community_groups where id = p_group_id) then
    return jsonb_build_object('error', 'not_found', 'status', 404);
  end if;
  if p_action not in ('feed', 'comments') then
    perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 710));
    delete from public.vital_id_community_actions where user_id = p_user_id and created_at < now() - interval '1 minute';
    select count(*) into v_count from public.vital_id_community_actions where user_id = p_user_id;
    if v_count >= 30 then
      return jsonb_build_object('error', 'rate_limited', 'status', 429);
    end if;
    insert into public.vital_id_community_actions(user_id) values (p_user_id);
  end if;

  if p_action = 'join' then
    if p_alias is null or char_length(btrim(p_alias)) not between 2 and 40 then
      return jsonb_build_object('error', 'invalid_request', 'status', 400);
    end if;
    insert into public.vital_id_community_members(user_id, group_id, alias)
      values (p_user_id, p_group_id, btrim(p_alias)) on conflict (user_id, group_id) do nothing;
    return jsonb_build_object('ok', true);
  end if;
  if p_action = 'leave' then
    delete from public.vital_id_community_members where user_id = p_user_id and group_id = p_group_id;
    return jsonb_build_object('ok', true);
  end if;
  if p_action = 'delete_post' then
    delete from public.vital_id_community_posts where id = p_entity_id and user_id = p_user_id and group_id = p_group_id returning id into v_id;
    if v_id is null then return jsonb_build_object('error', 'not_found', 'status', 404); end if;
    return jsonb_build_object('ok', true);
  end if;
  if p_action = 'delete_comment' then
    delete from public.vital_id_community_comments c where c.id = p_entity_id and c.user_id = p_user_id
      and exists (select 1 from public.vital_id_community_posts p where p.id = c.post_id and p.group_id = p_group_id)
      returning c.id into v_id;
    if v_id is null then return jsonb_build_object('error', 'not_found', 'status', 404); end if;
    return jsonb_build_object('ok', true);
  end if;

  select alias into v_alias from public.vital_id_community_members where user_id = p_user_id and group_id = p_group_id;
  if v_alias is null then return jsonb_build_object('error', 'join_required', 'status', 403); end if;
  if (p_before is null) <> (p_before_id is null) then
    return jsonb_build_object('error', 'invalid_request', 'status', 400);
  end if;

  if p_action = 'feed' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id, 'alias', p.alias, 'body', p.body, 'createdAt', p.created_at,
      'mine', p.user_id = p_user_id,
      'comments', (select count(*) from public.vital_id_community_comments c where c.post_id = p.id
        and not exists (select 1 from public.vital_id_community_reports r where r.comment_id = c.id and r.reporter_id = p_user_id))
    ) order by p.created_at desc, p.id desc), '[]'::jsonb) into v_result
    from (
      select * from public.vital_id_community_posts p where p.group_id = p_group_id
        and (p_before is null or (p.created_at, p.id) < (p_before, p_before_id))
        and not exists (select 1 from public.vital_id_community_reports r where r.post_id = p.id and r.reporter_id = p_user_id)
      order by p.created_at desc, p.id desc limit 31
    ) p;
    return jsonb_build_object('posts', v_result);
  end if;
  if p_action = 'post' then
    if p_body is null or char_length(btrim(p_body)) not between 1 and 2000 then
      return jsonb_build_object('error', 'invalid_request', 'status', 400);
    end if;
    insert into public.vital_id_community_posts(group_id, user_id, alias, body)
      values (p_group_id, p_user_id, v_alias, btrim(p_body)) returning id into v_id;
    return jsonb_build_object('ok', true, 'id', v_id);
  end if;

  if p_action in ('report_comment') then
    select p.group_id into v_group from public.vital_id_community_comments c
      join public.vital_id_community_posts p on p.id = c.post_id where c.id = p_entity_id;
  else
    select group_id into v_group from public.vital_id_community_posts where id = p_entity_id;
  end if;
  if v_group is null or v_group <> p_group_id then return jsonb_build_object('error', 'not_found', 'status', 404); end if;

  if p_action in ('comments', 'comment') and exists
    (select 1 from public.vital_id_community_reports where reporter_id = p_user_id and post_id = p_entity_id) then
    return jsonb_build_object('error', 'not_found', 'status', 404);
  end if;
  if p_action = 'comments' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'alias', c.alias, 'body', c.body, 'createdAt', c.created_at, 'mine', c.user_id = p_user_id
    ) order by c.created_at desc, c.id desc), '[]'::jsonb) into v_result
    from (
      select * from public.vital_id_community_comments c where c.post_id = p_entity_id
        and (p_before is null or (c.created_at, c.id) < (p_before, p_before_id))
        and not exists (select 1 from public.vital_id_community_reports r where r.comment_id = c.id and r.reporter_id = p_user_id)
      order by c.created_at desc, c.id desc limit 31
    ) c;
    return jsonb_build_object('comments', v_result);
  end if;
  if p_action = 'comment' then
    if p_body is null or char_length(btrim(p_body)) not between 1 and 1000 then
      return jsonb_build_object('error', 'invalid_request', 'status', 400);
    end if;
    insert into public.vital_id_community_comments(post_id, user_id, alias, body)
      values (p_entity_id, p_user_id, v_alias, btrim(p_body)) returning id into v_id;
    return jsonb_build_object('ok', true, 'id', v_id);
  end if;
  if p_body is null or p_body not in ('spam', 'unsafe', 'privacy', 'other') then
    return jsonb_build_object('error', 'invalid_request', 'status', 400);
  end if;
  insert into public.vital_id_community_reports(reporter_id, post_id, comment_id, reason)
    values (p_user_id,
      case when p_action = 'report_post' then p_entity_id else null end,
      case when p_action = 'report_comment' then p_entity_id else null end, p_body)
    on conflict do nothing;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.vital_id_community(uuid,text,text,uuid,text,text,timestamptz,uuid) from public, anon, authenticated;
grant execute on function public.vital_id_community(uuid,text,text,uuid,text,text,timestamptz,uuid) to service_role;
