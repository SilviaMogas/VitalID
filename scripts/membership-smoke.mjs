// Smoke test for the live vital_id_memberships table using the server secret key.
// Usage: SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/membership-smoke.mjs
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SECRET_KEY');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const userKey = `smoke_${crypto.randomBytes(8).toString('base64url')}`;
const fail = async (step, error) => {
  console.error(`FAIL ${step}:`, error.message);
  await db.from('vital_id_memberships').delete().eq('user_key', userKey);
  process.exit(1);
};

let r = await db
  .from('vital_id_memberships')
  .insert({ user_key: userKey, display_name: 'Smoke Test', plan: 'free' })
  .select('user_key')
  .single();
if (r.error) await fail('insert', r.error);
console.log('insert   ok', r.data.user_key);

r = await db
  .from('vital_id_memberships')
  .update({ plan: 'plus', activated_at: new Date().toISOString() })
  .eq('user_key', userKey)
  .select('plan')
  .single();
if (r.error) await fail('update', r.error);
console.log('update   ok plan=%s', r.data.plan);

r = await db.from('vital_id_memberships').select('plan').eq('user_key', userKey).single();
if (r.error) await fail('select', r.error);
console.log('select   ok plan=%s', r.data.plan);

r = await db.from('vital_id_memberships').delete().eq('user_key', userKey);
if (r.error) await fail('cleanup', r.error);
console.log('cleanup  ok');
