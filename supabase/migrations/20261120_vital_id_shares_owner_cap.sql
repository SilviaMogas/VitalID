-- Vital ID: enforce the per-owner share cap atomically.
-- POST /api/share counts the owner's shares before inserting, but concurrent
-- requests can all pass that check. This trigger serializes inserts per owner
-- with a transaction-scoped advisory lock and rejects inserts once the owner
-- already has 50 unexpired shares (MAX_STORED_SHARES_PER_OWNER in lib/sharing.ts).

begin;

create or replace function public.vital_id_shares_enforce_owner_cap()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_owner text := new.snapshot->>'ownerKey';
begin
  if v_owner is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('vital_id_shares:' || v_owner, 0));

  if (
    select count(*)
    from public.vital_id_shares
    where snapshot->>'ownerKey' = v_owner
      and expires_at > now()
  ) >= 50 then
    raise exception 'share_limit' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.vital_id_shares_enforce_owner_cap() from public, anon, authenticated;

drop trigger if exists vital_id_shares_owner_cap on public.vital_id_shares;
create trigger vital_id_shares_owner_cap
  before insert on public.vital_id_shares
  for each row execute function public.vital_id_shares_enforce_owner_cap();

commit;
