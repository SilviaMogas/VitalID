create table if not exists public.vitalid_shares (
  id text primary key,
  token text not null,
  created_at bigint not null,
  expires_at bigint not null,
  revoked_at bigint null,
  recipient_label text not null,
  fields jsonb not null,
  views jsonb not null default '[]'::jsonb
);

alter table public.vitalid_shares enable row level security;

revoke all on public.vitalid_shares from anon, authenticated;
grant all on public.vitalid_shares to service_role;

-- No RLS policies are defined: only the service-role key (which bypasses RLS) can read/write.
-- Set SUPABASE_SHARES_TABLE=vitalid_shares in the app env.
-- Optional: if the project exposes a custom schema, SUPABASE_SCHEMA can be used with a
-- schema-qualified table instead (the schema must be listed under Settings → API → Exposed schemas).
