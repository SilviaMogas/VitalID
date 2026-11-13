-- Vital ID: owner-scoped share listing.
-- GET /api/share filters by snapshot->>ownerKey and orders by created_at; this
-- index keeps that query from scanning every user's shares.

create index if not exists vital_id_shares_owner_created_idx
  on public.vital_id_shares ((snapshot->>'ownerKey'), created_at desc, id desc);
