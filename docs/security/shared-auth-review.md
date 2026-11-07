# Shared Supabase auth review

## Rollout

- Add `https://vitalid.site/signin` to the shared project's Auth redirect URL allow-list.
- Configure SMTP for confirmation email delivery before enabling this signup flow.
- Existing accounts are not altered or migrated by this change. Manually review the candidate accounts below; do not assume a confirmed address proves mailbox ownership.

## Read-only account review

Best-effort candidate list for non-wallet Vital ID signups that are marked confirmed. `auth.users` does not record whether confirmation came from a mailbox-proving flow, so review these rows manually:

```sql
select id, email, created_at, email_confirmed_at, last_sign_in_at
from auth.users
where email not like '%@wallet.vitalid.site'
  and raw_user_meta_data ? 'first_name'
  and email_confirmed_at is not null
order by created_at;
```

Synthetic wallet users without a server-controlled Vital ID wallet binding:

```sql
select id, email, created_at
from auth.users
where email like '%@wallet.vitalid.site'
  and coalesce(raw_app_meta_data -> 'vitalid_wallet', 'null'::jsonb) = 'null'::jsonb
order by created_at;
```
