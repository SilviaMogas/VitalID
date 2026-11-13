-- SOL pay: record that a payment was applied on the payment row itself.
-- The previous replay guard was stripe_checkout_session_id on the membership
-- row, which a membership reset (or alternating polls of two paid references)
-- could clear or overwrite, re-granting paid time from one on-chain payment.
-- applied_at is set in the same transaction that extends the membership,
-- under a row lock on the payment, so each settled payment applies once.
--
-- Apply this migration BEFORE deploying the code that calls
-- vital_id_sol_apply_payment (it drops vital_id_sol_activate).

begin;

alter table public.vital_id_sol_payments
  add column if not exists applied_at timestamptz;

comment on column public.vital_id_sol_payments.applied_at is
  'When this settled payment extended the membership; set once, atomically with the extension.';

-- Settled payments were already activated through vital_id_sol_activate.
update public.vital_id_sol_payments
  set applied_at = coalesce(confirmed_at, now())
  where status = 'paid' and signature is not null and applied_at is null;

create or replace function public.vital_id_sol_apply_payment(p_reference text)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  p public.vital_id_sol_payments%rowtype;
  r public.vital_id_memberships%rowtype;
  v_plan text;
  v_days integer;
  v_session_id text;
  v_end timestamptz;
  v_stripe_managed boolean;
begin
  select * into p
  from public.vital_id_sol_payments
  where reference = p_reference
  for update;

  if p.reference is null then
    raise exception 'sol payment not found';
  end if;
  if p.status <> 'paid' or p.signature is null then
    raise exception 'sol payment not settled';
  end if;
  -- Already applied (re-poll, retry, reset, other reference polled): no-op.
  if p.applied_at is not null then
    return false;
  end if;

  v_plan := case when p.plan = 'pro' then 'pro' else 'plus' end;
  v_days := case when p.interval = 'annual' then 365 else 30 end;
  v_session_id := 'sol:' || p.signature;

  select * into r
  from public.vital_id_memberships
  where user_key = p.user_key
  for update;

  if r.user_key is null then
    insert into public.vital_id_memberships (
      user_key, plan, stripe_checkout_session_id, stripe_payment_intent_id,
      subscription_status, subscription_period_end, activated_at, plan_chosen_at
    ) values (
      p.user_key, v_plan, v_session_id, p.payer,
      'sol_one_time', now() + make_interval(days => v_days), now(), now()
    );
  else
    -- Stripe-managed members keep Stripe-owned status/period.
    v_stripe_managed :=
      r.stripe_subscription_id is not null
      and r.subscription_status in ('active', 'trialing', 'past_due');

    -- Additive: paid days stack on top of remaining paid time, never replace it.
    v_end := greatest(now(), coalesce(r.subscription_period_end, '-infinity'::timestamptz))
      + make_interval(days => v_days);

    update public.vital_id_memberships set
      plan = case
        when v_plan = 'pro' and r.plan in ('free', 'plus') then 'pro'
        when v_plan = 'plus' and r.plan = 'free' then 'plus'
        else r.plan
      end,
      stripe_checkout_session_id = v_session_id,
      stripe_payment_intent_id = coalesce(p.payer, r.stripe_payment_intent_id),
      subscription_status = case
        when v_stripe_managed then r.subscription_status else 'sol_one_time' end,
      subscription_period_end = case
        when v_stripe_managed then r.subscription_period_end else v_end end,
      activated_at = now(),
      plan_chosen_at = coalesce(r.plan_chosen_at, now()),
      updated_at = now()
    where user_key = p.user_key;
  end if;

  update public.vital_id_sol_payments
    set applied_at = now()
    where reference = p_reference;
  return true;
end $$;

revoke all on function public.vital_id_sol_apply_payment(text)
  from public, anon, authenticated;
grant execute on function public.vital_id_sol_apply_payment(text) to service_role;

-- Replaced: its only replay guard lived on the membership row.
drop function if exists public.vital_id_sol_activate(text, text, integer, text, text);

commit;
