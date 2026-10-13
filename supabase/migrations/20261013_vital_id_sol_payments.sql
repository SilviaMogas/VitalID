-- Vital ID: one-time SOL (Solana Pay) membership payments.
-- Each row is a pending payment request identified by its unique `reference`
-- public key (embedded in the transfer so it can be found on-chain). The
-- settling transaction `signature` is claimed atomically so a payment can
-- never activate two requests. RLS on with no policies: server secret only.
-- Run in Supabase SQL editor or via `supabase db push`.

create table if not exists public.vital_id_sol_payments (
  reference text primary key,
  user_key text not null,
  plan text not null,
  interval text not null,
  lamports bigint not null,
  treasury text not null,
  cluster text not null,
  status text not null default 'pending',
  signature text,
  payer text,
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists vital_id_sol_payments_signature_key
  on public.vital_id_sol_payments (signature)
  where signature is not null;

create index if not exists vital_id_sol_payments_user_idx
  on public.vital_id_sol_payments (user_key);

alter table public.vital_id_sol_payments enable row level security;

comment on table public.vital_id_sol_payments is
  'Pending and settled one-time Solana Pay membership payments (SOL transfers).';
comment on column public.vital_id_sol_payments.reference is
  'Fresh per-checkout public key embedded in the transfer (Solana Pay reference).';
comment on column public.vital_id_sol_payments.signature is
  'Signature of the on-chain transaction that settled this request; unique when set.';
