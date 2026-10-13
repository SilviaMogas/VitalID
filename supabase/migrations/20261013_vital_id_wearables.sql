-- Vital ID: generic wearable connectors (Oura, Strava, ...) + device-push ingest
-- (Apple Health / Health Connect via a companion app).
-- Server-only access: RLS on, no policies, grants revoked. `user_key` has no FK
-- so the demo account behaves like the WHOOP tables.

create table if not exists public.vital_id_wearable_connections (
  user_key         text not null,
  provider         text not null,
  external_user_id text,
  access_token     text not null,
  refresh_token    text,
  expires_at       timestamptz not null,
  scope            text,
  connected_at     timestamptz not null default now(),
  last_synced_at   timestamptz,
  last_sync_error  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  primary key (user_key, provider)
);

create table if not exists public.vital_id_wearable_daily (
  user_key         text not null,
  provider         text not null,
  date             date not null,
  sleep_hours      numeric(4,2),
  sleep_score      numeric(5,1),
  readiness_score  numeric(5,1),
  hrv_ms           numeric(6,1),
  resting_hr       numeric(5,1),
  steps            integer,
  active_minutes   numeric(6,1),
  calories         numeric(7,1),
  distance_m       numeric(9,1),
  workout_count    smallint,
  avg_heart_rate   numeric(5,1),
  updated_at       timestamptz not null default now(),
  primary key (user_key, provider, date)
);

-- One push token per user (SHA-256 hash only; the raw token is shown once).
create table if not exists public.vital_id_wearable_ingest_tokens (
  user_key    text primary key,
  token_hash  text not null unique,
  created_at  timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.vital_id_wearable_connections   enable row level security;
alter table public.vital_id_wearable_daily         enable row level security;
alter table public.vital_id_wearable_ingest_tokens enable row level security;

revoke all on public.vital_id_wearable_connections   from anon, authenticated;
revoke all on public.vital_id_wearable_daily         from anon, authenticated;
revoke all on public.vital_id_wearable_ingest_tokens from anon, authenticated;

comment on table public.vital_id_wearable_connections is
  'OAuth connection per (Vital ID user key, wearable provider). Holds tokens — server-only.';
comment on table public.vital_id_wearable_daily is
  'Normalised daily metrics per provider (oura, strava, apple_health, health_connect).';
comment on table public.vital_id_wearable_ingest_tokens is
  'Hashed bearer tokens for companion apps that push Apple Health / Health Connect data.';
