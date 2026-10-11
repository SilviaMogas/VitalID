-- Vital ID: real Stripe subscriptions on membership rows.
-- Adds the fields the webhook syncs when a subscription changes state.
-- Run in Supabase SQL editor or via `supabase db push`.

alter table public.vital_id_memberships
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text,
  add column if not exists subscription_period_end timestamptz;

create index if not exists vital_id_memberships_subscription_idx
  on public.vital_id_memberships (stripe_subscription_id);

comment on column public.vital_id_memberships.stripe_subscription_id is
  'Stripe Subscription id (sub_…) behind the current paid plan.';
comment on column public.vital_id_memberships.subscription_status is
  'Last known Stripe subscription status: active, trialing, past_due, canceled, unpaid, …';
comment on column public.vital_id_memberships.subscription_period_end is
  'End of the current paid period — access continues until then after cancel_at_period_end.';
