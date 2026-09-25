# Vital ID — Supabase backend (Chat C)

## Environment variables

| Variable | Where | Required | Notes |
|---|---|---|---|
| `SUPABASE_URL` | server | for Supabase mode | Project URL `https://<ref>.supabase.co` |
| `SUPABASE_SECRET_KEY` | server | for Supabase mode | Secret / `service_role` key. Bypasses RLS. **Never** in client code. |
| `NEXT_PUBLIC_SUPABASE_URL` | client | no | Reserved for future client features. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client | no | Reserved. Has **no** access to `vital_id_*` tables (RLS, no policies). |
| `SHARE_STORE` | server | no | `supabase` \| `memory`. Empty = auto. |

Copy `.env.example` → `.env.local`. Never commit real values (`.env*` is gitignored).

## Switching MemoryShareStore ↔ SupabaseShareStore

Always go through `getShareStore()` from `@/lib/share-storage/store`:

- **Auto (default):** Supabase if `SUPABASE_URL` + `SUPABASE_SECRET_KEY` are set, else memory.
- **Force memory:** `SHARE_STORE=memory`
- **Force Supabase:** `SHARE_STORE=supabase` (throws a clear error if env is missing)

Both classes implement the same `ShareStore` interface, so no UI/API logic changes.

## Schema

Migrations live in `supabase/migrations/`:

1. `20260925_vital_id_shares.sql` — **required**: `vital_id_shares` + indexes + RLS.
2. `20260925_vital_id_optional_tables.sql` — optional: `vital_id_profiles`, `vital_id_metrics`, `vital_id_events`.

Apply via Supabase Dashboard → SQL editor (paste file) or `supabase db push`.

## Security model

- RLS enabled on every `vital_id_*` table with **no policies** and grants revoked from
  `anon`/`authenticated` → the publishable key can never read/write shares.
- All access is via the secret key inside `lib/supabase/server.ts`, which is guarded with
  `import 'server-only'` (build fails if a client component imports it).
- `snapshot` only ever contains keys listed in `selected_fields` (`pickSelectedFields`).
- Tokens are 22-char `base64url` random strings (128 bits).
