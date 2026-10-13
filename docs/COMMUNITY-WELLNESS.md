# Community and private wellbeing records

This guide describes the member features at `/community` and
`/wellness?kind=workout|supplement`, their storage requirements and privacy
boundaries.

## Community

Sign in with a member account and open `/community`.
Choose `general`, a hobby group, or a city group. Joining requires accepting the
group rules and choosing a public alias for that group. Aliases are per group.
The community shows actual aggregate member counts, not a directory of member
identities.

Members can publish plain-text posts and comments, delete their own posts and
comments, and report a post or comment. Reporting hides the reported item for
the reporter; it is not a promise of staffed moderation or removal for everyone.
Health-profile and connector data are not automatically added to community
posts; only text a member explicitly posts is visible to that group.

Leaving a group does not remove posts or comments already made there. Delete
your own content before leaving, or rejoin that group later to manage it.

## Workouts and supplements

Open `/wellness?kind=workout` to keep a personal workout table, or
`/wellness?kind=supplement` to keep personal supplement records. Entries are
private to the authenticated account; they are not community posts and are not
automatically included in a share.

Workout entries contain a title, exercise names, sets, repetitions, notes and
optional exercise notes. Supplement entries contain a name and self-entered
amount, schedule and note. Amounts and schedules are the member's own records:
the feature does not calculate doses, recommend supplements or make clinical
claims.

The API requires the current health-data consent for listing, creating and
updating wellness entries. An authenticated member can delete their own entry
even without current health-data consent. Updates use the entry's `updatedAt`
value for optimistic concurrency; a stale edit is rejected as a conflict rather
than silently overwriting a newer version.

## Supabase setup and migrations

Follow the project and local configuration instructions in
[`SUPABASE.md`](SUPABASE.md), then apply these exact migrations to the Supabase
project before enabling the features:

- [`20261012_vital_id_community.sql`](../supabase/migrations/20261012_vital_id_community.sql)
- [`20261012_vital_id_wellness.sql`](../supabase/migrations/20261012_vital_id_wellness.sql)
- [`20261013_vital_id_wellness_deletion_metadata.sql`](../supabase/migrations/20261013_vital_id_wellness_deletion_metadata.sql)

Community and wellness use server-only RPCs. The authenticated identity comes
from the server session, never from a client-supplied user ID. Tables have RLS
enabled and direct access is denied to `anon` and `authenticated`; only the
`service_role` RPC boundary can perform the intended operations. If a migration
or RPC is missing, the routes fail closed with an unavailable response. They
have no in-memory fallback.

The 20261013 migration is additive: it provides only bounded deletion metadata
for the owner and does not replace or alter the original wellness RPC, table or
RLS migration. Apply it after the two 20261012 migrations with the same
authorized, manual migration process. The migrations were applied only to the
isolated local Supabase project during the recorded verification; no production
migration was applied here.

## Web install metadata

The web manifest and PNG icons provide standalone-display metadata for the web
app. This does not make Vital ID a native iOS or Android app. There is no service
worker or offline cache, and offline use is not promised. End-to-end installation
was not verified in a fresh or incognito browser.

## Previously recorded verification

The following results were recorded on 2026-10-12 and are reproduced here as
frozen evidence, not as tests rerun while writing this guide:

- `npm run test:community` — 11/11 route-contract tests passed.
- `npm run test:wellness` — 6/6 route-contract tests passed.
- `npm run test:isolation` — 38/38 tests passed.
- Local SQL checks and browser flows with two synthetic accounts were verified
  against the isolated local Supabase project.

These results cover local, synthetic-account testing only. They do not establish
production deployment, production security, or behavior with real members.
