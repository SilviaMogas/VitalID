-- Vital ID: membership / plan records (separate from health sharing tables)
-- Run in Supabase SQL editor or via `supabase db push`.

create table if not exists public.vital_id_memberships (
  user_key                   text primary key,
  display_name               text,
  email                      text,
  plan                       text not null default 'free'
                             check (plan in ('free', 'plus', 'pro')),
  stripe_customer_id         text,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id   text,
  activated_at               timestamptz,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create index if not exists vital_id_memberships_customer_idx
  on public.vital_id_memberships (stripe_customer_id);

-- RLS on, NO policies: anon / publishable keys get nothing.
-- Only the server-side secret (service_role) key, which bypasses RLS, can touch this table.
alter table public.vital_id_memberships enable row level security;

revoke all on public.vital_id_memberships from anon, authenticated;

comment on table public.vital_id_memberships is
  'Vital ID membership plans. Keyed by opaque user_key (httpOnly cookie or demo user). Server-only access.';
