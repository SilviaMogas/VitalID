-- Vital ID: append-only consent audit log (GDPR Art. 9 explicit consent for
-- health-data processing, plus privacy-policy acceptance). Server-only access:
-- RLS on, no policies — API routes write/read through the secret key.

create table if not exists public.vital_id_consents (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  consent_type   text not null check (consent_type in ('privacy_policy', 'terms_of_service', 'health_data')),
  policy_version text not null,
  consented_at   timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

create index if not exists vital_id_consents_user_type_idx
  on public.vital_id_consents (user_id, consent_type, consented_at desc);

alter table public.vital_id_consents enable row level security;
revoke all on public.vital_id_consents from anon, authenticated;

comment on table public.vital_id_consents is
  'Vital ID consent audit: one row per consent event (privacy/terms acceptance, explicit health-data consent). Never update rows — insert a new one when the user re-consents.';
