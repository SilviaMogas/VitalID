import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(new URL('../../supabase/migrations/20261020_explicit_service_role_table_grants.sql', import.meta.url), 'utf8');
const tables = [
  'vital_id_memberships', 'vital_id_user_profiles', 'vital_id_health_profiles',
  'vital_id_health_goals', 'vital_id_health_baselines', 'vital_id_user_connectors',
  'vital_id_profiles', 'vital_id_metrics', 'vital_id_events', 'vital_id_shares',
  'vital_id_whoop_connections', 'vital_id_whoop_daily', 'vital_id_consents',
  'vital_id_sol_payments', 'vital_id_wallet_nonces', 'vital_id_wearable_connections',
  'vital_id_wearable_daily', 'vital_id_wearable_ingest_tokens',
];

test('server-only tables have explicit SQL grants without changing RLS', () => {
  for (const table of tables) {
    assert.match(migration, new RegExp('public\\.' + table + '(?:[,\\s]|$)'), table + ' is covered by ACL migration');
  }
  assert.match(migration, /revoke all privileges on table[\\s\\S]*from public, anon, authenticated/i);
  assert.match(migration, /grant select, insert, update, delete on table[\\s\\S]*to service_role/i);
  assert.match(migration, /grant usage on schema public to service_role/i);
  assert.doesNotMatch(migration, /alter table .* (?:enable|disable) row level security/i, 'migration must not alter RLS state');
  assert.doesNotMatch(migration, /create policy/i, 'migration must not create browser policies');
});
