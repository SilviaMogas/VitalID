-- Password sign-in attempt throttle (lib/auth/login-throttle.ts).
-- One fixed-window counter per key. Keys are SHA-256 digests of the
-- normalized email or the client IP; no raw identifiers are stored.
-- Server-only: called through the secret/service-role key.
begin;

create table if not exists public.vital_id_auth_attempts (
  key           text primary key,
  window_start  timestamptz not null default now(),
  attempts      integer not null default 0
);

create index if not exists vital_id_auth_attempts_window_start_idx
  on public.vital_id_auth_attempts (window_start);

alter table public.vital_id_auth_attempts enable row level security;

revoke all privileges on table public.vital_id_auth_attempts from public, anon, authenticated;
grant select, insert, update, delete on table public.vital_id_auth_attempts to service_role;

-- Atomically counts one attempt for p_key. Returns 0 when the attempt is
-- within p_limit for the current window, otherwise the seconds until the
-- window resets.
create or replace function public.vital_id_auth_attempt(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_window interval;
  v_attempts integer;
  v_start timestamptz;
begin
  if p_key is null or char_length(p_key) = 0 or char_length(p_key) > 128
     or p_limit is null or p_limit < 1
     or p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid auth attempt arguments';
  end if;
  v_window := make_interval(secs => p_window_seconds);

  insert into public.vital_id_auth_attempts as a (key, window_start, attempts)
  values (p_key, now(), 1)
  on conflict (key) do update set
    attempts = case when a.window_start <= now() - v_window then 1 else a.attempts + 1 end,
    window_start = case when a.window_start <= now() - v_window then now() else a.window_start end
  returning a.attempts, a.window_start into v_attempts, v_start;

  delete from public.vital_id_auth_attempts
  where window_start < now() - interval '1 day';

  if v_attempts > p_limit then
    return greatest(1, ceil(extract(epoch from (v_start + v_window - now())))::integer);
  end if;
  return 0;
end;
$$;

revoke all on function public.vital_id_auth_attempt(text, integer, integer) from public, anon, authenticated;
grant execute on function public.vital_id_auth_attempt(text, integer, integer) to service_role;

comment on table public.vital_id_auth_attempts is
  'Password sign-in attempt counters keyed by hashed email / client IP. Server-only; brute-force throttle for /api/auth/signin and /api/mobile/v1/auth/signin.';

commit;
