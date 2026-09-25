-- Vital ID: temporary selective shares (PRIMARY TABLE)
-- Run in Supabase SQL editor or via `supabase db push`.

create extension if not exists pgcrypto;

create table if not exists public.vital_id_shares (
  id              uuid primary key default gen_random_uuid(),
  token           text unique not null,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null,
  revoked         boolean not null default false,
  purpose         text,
  selected_fields jsonb not null default '[]'::jsonb,
  snapshot        jsonb not null
);

create index if not exists vital_id_shares_token_idx      on public.vital_id_shares (token);
create index if not exists vital_id_shares_expires_at_idx on public.vital_id_shares (expires_at);

-- RLS on, NO policies: anon / publishable keys get nothing.
-- Only the server-side secret (service_role) key, which bypasses RLS, can touch this table.
alter table public.vital_id_shares enable row level security;

revoke all on public.vital_id_shares from anon, authenticated;

comment on table public.vital_id_shares is
  'Vital ID temporary shares. snapshot contains ONLY the user-selected fields. Server-only access.';
