-- Vital ID: per-user onboarding data (profile, health profile, goals, baseline, connectors).
-- Keyed by Supabase Auth user id. Server-only access (RLS on, no policies) —
-- the app talks to these tables exclusively through the secret key in API routes.

create table if not exists public.vital_id_user_profiles (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  first_name           text,
  last_name            text,
  dob                  date,
  gender               text,
  nationality          text,
  country              text,
  city                 text,
  height_cm            numeric(5,1),
  weight_kg            numeric(5,1),
  plan_selected        boolean not null default false,
  onboarding_step      smallint not null default 1,
  onboarding_completed boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table if not exists public.vital_id_health_profiles (
  user_id                 uuid primary key references auth.users (id) on delete cascade,
  allergies               text,
  medications             text,
  conditions              text,
  blood_type              text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  notes                   text,
  updated_at              timestamptz not null default now()
);

create table if not exists public.vital_id_health_goals (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  goals      text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.vital_id_health_baselines (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  sleep_hours       numeric(4,1),
  resting_hr        smallint,
  steps             integer,
  workouts_per_week smallint,
  activity_level    text,
  hydration_goal_ml integer,
  calorie_target    integer,
  protein_target_g  integer,
  source            text not null default 'manual',
  updated_at        timestamptz not null default now()
);

create table if not exists public.vital_id_user_connectors (
  user_id      uuid not null references auth.users (id) on delete cascade,
  provider     text not null,
  category     text not null,
  status       text not null default 'waiting_implementation'
               check (status in ('connected', 'waiting_implementation', 'coming_soon', 'disconnected')),
  connected_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, provider, category)
);

alter table public.vital_id_user_profiles    enable row level security;
alter table public.vital_id_health_profiles  enable row level security;
alter table public.vital_id_health_goals     enable row level security;
alter table public.vital_id_health_baselines enable row level security;
alter table public.vital_id_user_connectors  enable row level security;

revoke all on public.vital_id_user_profiles    from anon, authenticated;
revoke all on public.vital_id_health_profiles  from anon, authenticated;
revoke all on public.vital_id_health_goals     from anon, authenticated;
revoke all on public.vital_id_health_baselines from anon, authenticated;
revoke all on public.vital_id_user_connectors  from anon, authenticated;

comment on table public.vital_id_user_profiles is
  'Vital ID onboarding: identity + onboarding progress per Supabase Auth user. Server-only access.';
comment on table public.vital_id_health_baselines is
  'Vital ID onboarding: manual lifestyle baseline. `source` is manual until a connector overwrites values.';
comment on table public.vital_id_user_connectors is
  'Vital ID connector preferences. Status is never `connected` without a real provider integration.';
