-- Production-ready storage for profiles, daily history and Stripe membership state.
-- Apply after enabling Supabase Auth. The browser uses a publishable/anon key with RLS;
-- service-role or secret keys stay on the server only.

create table if not exists public.vitalid_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  locale text not null default 'ar' check (locale in ('ar', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vitalid_daily_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  mood smallint check (mood between 1 and 5),
  energy text check (energy in ('low', 'steady', 'high')),
  note text not null default '',
  movement text not null default '',
  movement_minutes integer check (movement_minutes between 0 and 1440),
  food text not null default '',
  source text not null default 'manual' check (source in ('manual', 'voice', 'plaud', 'sample')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create table if not exists public.vitalid_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free' check (plan in ('free', 'plus', 'circle')),
  status text not null default 'inactive',
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.vitalid_profiles to authenticated;
grant select, insert, update, delete on public.vitalid_daily_entries to authenticated;
grant select on public.vitalid_memberships to authenticated;

alter table public.vitalid_profiles enable row level security;
alter table public.vitalid_daily_entries enable row level security;
alter table public.vitalid_memberships enable row level security;

create policy "profile owner can select" on public.vitalid_profiles for select using (auth.uid() = user_id);
create policy "profile owner can insert" on public.vitalid_profiles for insert with check (auth.uid() = user_id);
create policy "profile owner can update" on public.vitalid_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "daily owner can select" on public.vitalid_daily_entries for select using (auth.uid() = user_id);
create policy "daily owner can insert" on public.vitalid_daily_entries for insert with check (auth.uid() = user_id);
create policy "daily owner can update" on public.vitalid_daily_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "daily owner can delete" on public.vitalid_daily_entries for delete using (auth.uid() = user_id);
create policy "membership owner can select" on public.vitalid_memberships for select using (auth.uid() = user_id);

-- Membership writes belong in a verified Stripe webhook running with a server-side
-- secret/service-role key. Never let the browser mark a paid plan as active.
