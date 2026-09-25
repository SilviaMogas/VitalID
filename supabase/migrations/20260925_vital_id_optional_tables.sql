-- Vital ID: OPTIONAL tables (lower priority; not required by the share flow).

create extension if not exists pgcrypto;

create table if not exists public.vital_id_profiles (
  id               uuid primary key default gen_random_uuid(),
  external_user_id text,
  display_name     text,
  language         text,
  emergency_info   jsonb,
  health_profile   jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists vital_id_profiles_external_user_id_idx
  on public.vital_id_profiles (external_user_id);

create table if not exists public.vital_id_metrics (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references public.vital_id_profiles (id) on delete cascade,
  metric      text not null,
  value       numeric,
  unit        text,
  source      text,
  recorded_at timestamptz not null default now(),
  metadata    jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists vital_id_metrics_profile_metric_recorded_idx
  on public.vital_id_metrics (profile_id, metric, recorded_at desc);

create table if not exists public.vital_id_events (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid references public.vital_id_profiles (id) on delete set null,
  event_type text not null, -- share_created | share_opened | share_revoked | share_expired
  payload    jsonb,
  created_at timestamptz not null default now()
);
create index if not exists vital_id_events_profile_created_idx
  on public.vital_id_events (profile_id, created_at desc);
create index if not exists vital_id_events_type_idx on public.vital_id_events (event_type);

alter table public.vital_id_profiles enable row level security;
alter table public.vital_id_metrics  enable row level security;
alter table public.vital_id_events   enable row level security;

revoke all on public.vital_id_profiles from anon, authenticated;
revoke all on public.vital_id_metrics  from anon, authenticated;
revoke all on public.vital_id_events   from anon, authenticated;
