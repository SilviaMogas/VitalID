import test from 'node:test';
import assert from 'node:assert/strict';

const { rows } = await import('./membership-supabase-stub.mjs');
const { SupabaseMembershipStore } = await import('@/lib/membership/supabase-store');

const store = new SupabaseMembershipStore();
const FUTURE = '2999-01-01T00:00:00.000Z';

function seed(userKey) {
  rows.set(userKey, {
    user_key: userKey,
    display_name: 'Member',
    email: 'member@example.test',
    plan: 'free',
    stripe_customer_id: null,
    stripe_checkout_session_id: null,
    stripe_payment_intent_id: null,
    stripe_subscription_id: null,
    subscription_status: null,
    subscription_period_end: null,
    activated_at: null,
    plan_chosen_at: null,
    onboarding_completed_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  });
}

// Simulates vital_id_sol_activate committing right after any stale read.
function activateAfterNextRead(userKey) {
  globalThis.__membershipAfterRead = () => {
    Object.assign(rows.get(userKey), {
      plan: 'plus',
      stripe_checkout_session_id: 'sol:sig-race',
      subscription_status: 'sol_one_time',
      subscription_period_end: FUTURE,
    });
  };
}

// Lands the activation now if the store never read the row.
function settleActivation() {
  const pending = globalThis.__membershipAfterRead;
  delete globalThis.__membershipAfterRead;
  if (typeof pending === 'function') pending();
}

function assertPaid(userKey) {
  const row = rows.get(userKey);
  assert.equal(row.plan, 'plus');
  assert.equal(row.stripe_checkout_session_id, 'sol:sig-race');
  assert.equal(row.subscription_period_end, FUTURE);
}

test('membership upsert never overwrites a concurrent SOL activation', async () => {
  const user = 'user-race-upsert';
  seed(user);
  activateAfterNextRead(user);
  // Any read the store does runs the activation first, so a stale whole-row
  // write would revert the paid plan.
  await store.upsert({ userKey: user, displayName: 'Renamed' });
  settleActivation();
  assert.equal(rows.get(user).display_name, 'Renamed');
  assertPaid(user);
});

test('onboarding stamps never overwrite a concurrent SOL activation', async () => {
  const user = 'user-race-stamp';
  seed(user);
  activateAfterNextRead(user);
  await store.markPlanChosen(user);
  settleActivation();
  assert.ok(rows.get(user).plan_chosen_at);
  assertPaid(user);
});

test('upsert creates a free row once and keeps existing data', async () => {
  const user = 'user-race-new';
  const created = await store.upsert({ userKey: user, email: 'new@example.test' });
  assert.equal(created.plan, 'free');
  assert.equal(rows.get(user).email, 'new@example.test');
  await store.upsert({ userKey: user });
  assert.equal(rows.get(user).email, 'new@example.test');
});
