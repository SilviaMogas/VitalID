// Smoke test for the live vital_id_shares table using the server secret key.
// Usage: SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/supabase-smoke.mjs
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SECRET_KEY');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const token = crypto.randomBytes(16).toString('base64url');
const fail = async (step, error) => {
  console.error(`FAIL ${step}:`, error.message);
  await db.from('vital_id_shares').delete().eq('token', token);
  process.exit(1);
};

let r = await db
  .from('vital_id_shares')
  .insert({
    token,
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    purpose: 'smoke',
    selected_fields: ['identity'],
    snapshot: { identity: { name: 'Smoke Test' } },
  })
  .select('id')
  .single();
if (r.error) await fail('insert', r.error);
console.log('insert   ok', r.data.id);

r = await db.from('vital_id_shares').select('revoked').eq('token', token).single();
if (r.error) await fail('select', r.error);
console.log('select   ok revoked=%s', r.data.revoked);

r = await db.from('vital_id_shares').update({ revoked: true }).eq('token', token).select('revoked').single();
if (r.error) await fail('revoke', r.error);
console.log('revoke   ok revoked=%s', r.data.revoked);

r = await db.from('vital_id_shares').delete().eq('token', token);
if (r.error) await fail('cleanup', r.error);
console.log('cleanup  ok');

const anon = await fetch(`${url}/rest/v1/vital_id_shares?select=id`, { headers: { apikey: 'invalid' } });
console.log('anon blocked:', anon.status === 401 ? 'ok (401)' : `UNEXPECTED ${anon.status}`);
