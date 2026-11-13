-- SOL pay: remember every payment applied to a membership, not just the last
-- one, so re-polling an already-paid reference (after a reset, or alternating
-- between two paid references) can never extend a plan twice.
-- Run in Supabase SQL editor or via `supabase db push`.

create table if not exists public.vital_id_sol_applied_sessions (
  session_id text primary key,
  user_key text not null,
  applied_at timestamptz not null default now()
);

alter table public.vital_id_sol_applied_sessions enable row level security;
revoke all privileges on table public.vital_id_sol_applied_sessions from public, anon, authenticated;
grant select, insert, update, delete on table public.vital_id_sol_applied_sessions to service_role;

-- Payments claimed before this migration already applied their days.
insert into public.vital_id_sol_applied_sessions (session_id, user_key, applied_at)
select 'sol:' || signature, user_key, coalesce(confirmed_at, now())
from public.vital_id_sol_payments
where signature is not null
on conflict (session_id) do nothing;

create or replace function public.vital_id_sol_activate(
  p_user_key text,
  p_plan text,
  p_extend_days integer,
  p_session_id text,
  p_payer text
) returns void
language plpgsql
set search_path = public
as $$
declare
  r public.vital_id_memberships%rowtype;
  v_base timestamptz;
  v_end timestamptz;
  v_stripe_managed boolean;
begin
  -- Each payment applies at most once, ever (re-polls, resets, alternating refs).
  insert into public.vital_id_sol_applied_sessions (session_id, user_key)
  values (p_session_id, p_user_key)
  on conflict (session_id) do nothing;
  if not found then
    return;
  end if;

  select * into r
  from public.vital_id_memberships
  where user_key = p_user_key
  for update;

  if r.user_key is null then
    insert into public.vital_id_memberships (
      user_key, plan, stripe_checkout_session_id, stripe_payment_intent_id,
      subscription_status, subscription_period_end, activated_at, plan_chosen_at
    ) values (
      p_user_key, p_plan, p_session_id, p_payer,
      'sol_one_time', now() + make_interval(days => p_extend_days), now(), now()
    );
    return;
  end if;

  -- This payment already applied (claim retry / re-poll): no-op.
  if r.stripe_checkout_session_id = p_session_id then
    return;
  end if;

  -- Stripe-managed members keep Stripe-owned status/period.
  v_stripe_managed :=
    r.stripe_subscription_id is not null
    and r.subscription_status in ('active', 'trialing', 'past_due');

  -- Additive: paid days stack on top of remaining paid time, never replace it.
  v_base := greatest(now(), coalesce(r.subscription_period_end, '-infinity'::timestamptz));
  v_end := v_base + make_interval(days => p_extend_days);

  update public.vital_id_memberships set
    plan = case
      when p_plan = 'pro' and r.plan in ('free', 'plus') then 'pro'
      when p_plan = 'plus' and r.plan = 'free' then 'plus'
      else r.plan
    end,
    stripe_checkout_session_id = p_session_id,
    stripe_payment_intent_id = coalesce(p_payer, r.stripe_payment_intent_id),
    subscription_status = case
      when v_stripe_managed then r.subscription_status else 'sol_one_time' end,
    subscription_period_end = case
      when v_stripe_managed then r.subscription_period_end else v_end end,
    activated_at = now(),
    plan_chosen_at = coalesce(r.plan_chosen_at, now()),
    updated_at = now()
  where user_key = p_user_key;
end $$;

revoke all on function public.vital_id_sol_activate(text, text, integer, text, text)
  from anon, authenticated;
