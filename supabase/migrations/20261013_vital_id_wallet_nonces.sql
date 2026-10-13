-- Single-use nonces for Solana wallet sign-in (lib/auth/wallet-nonce.ts).
-- A nonce may be claimed exactly once: replay of a captured signed message
-- within its TTL is refused. Rows are swept once they outlive the TTL.

create table if not exists public.vital_id_wallet_nonces (
  nonce       text primary key,
  created_at  timestamptz not null default now()
);

alter table public.vital_id_wallet_nonces enable row level security;

revoke all on public.vital_id_wallet_nonces from anon, authenticated;

comment on table public.vital_id_wallet_nonces is
  'Claimed wallet sign-in nonces. Server-only access; replay protection for /api/auth/sol/verify.';
