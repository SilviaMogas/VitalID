alter table public.vital_id_memberships
  add column if not exists plan_chosen_at timestamptz,
  add column if not exists onboarding_completed_at timestamptz;

create index if not exists vital_id_memberships_email_idx
  on public.vital_id_memberships (lower(email));
