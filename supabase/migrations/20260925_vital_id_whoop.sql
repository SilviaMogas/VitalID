-- Vital ID: WHOOP connector state + synced daily metrics.
-- `user_key` is the membership user key (Supabase Auth user id for members,
-- DEMO_USER_KEY for the Fatima demo) — it intentionally has NO FK to auth.users
-- so the demo account can hold a connection too. Server-only access (RLS on,
-- no policies): the app talks to these tables exclusively through the secret
-- key in API routes.

create table if not exists public.vital_id_whoop_connections (
  user_key         text primary key,
  whoop_user_id    bigint,
  access_token     text not null,
  refresh_token    text not null,
  expires_at       timestamptz not null,
  scope            text,
  height_m         numeric(4,2),
  weight_kg        numeric(5,1),
  max_heart_rate   smallint,
  connected_at     timestamptz not null default now(),
  last_synced_at   timestamptz,
  last_sync_error  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.vital_id_whoop_daily (
  user_key          text not null,
  date              date not null,
  recovery_score    numeric(5,1),
  hrv_ms            numeric(6,1),
  resting_hr        numeric(5,1),
  sleep_hours       numeric(4,2),
  sleep_performance numeric(5,1),
  strain            numeric(5,2),
  avg_heart_rate    numeric(5,1),
  workout_minutes   numeric(6,1),
  workout_count     smallint,
  updated_at        timestamptz not null default now(),
  primary key (user_key, date)
);

alter table public.vital_id_whoop_connections enable row level security;
alter table public.vital_id_whoop_daily       enable row level security;

revoke all on public.vital_id_whoop_connections from anon, authenticated;
revoke all on public.vital_id_whoop_daily       from anon, authenticated;

comment on table public.vital_id_whoop_connections is
  'WHOOP OAuth connection per Vital ID user key. Stores rotating tokens — server-only, never exposed to clients.';
comment on table public.vital_id_whoop_daily is
  'Daily WHOOP metrics mapped from cycles, recoveries, sleeps and workouts. Kept on sync failure.';
