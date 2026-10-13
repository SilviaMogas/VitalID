import test from 'node:test';
import assert from 'node:assert/strict';

// Force memory backends + a valid treasury before importing solpay modules.
for (const key of ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'NEXT_PUBLIC_SUPABASE_URL']) {
  delete process.env[key];
}
process.env.SOL_TREASURY_ADDRESS = 'CLEkAv9zNZRHqgCQmtt3RuzUnkr3XVWH9Wnq4Rmo4WUP';
process.env.SOL_PAY_CLUSTER = 'devnet';
process.env.SOL_PAYMENT_STORE = 'memory';
process.env.MEMBERSHIP_STORE = 'memory';
process.env.SOL_PAY_LAMPORTS_PLUS_MONTHLY = '20000000';

const TREASURY = process.env.SOL_TREASURY_ADDRESS;
const LAMPORTS = 20_000_000n;

const { base58Decode, base58Encode, isSolanaAddress } = await import('@/lib/solpay/base58');
const { buildSolanaPayUrl, confirmSolPayment, createSolPayment, extractPayment, lamportsToSol } =
  await import('@/lib/solpay/service');
const { readSolPayConfig, solPayLamports } = await import('@/lib/solpay/config');
const { getSolPaymentStore } = await import('@/lib/solpay/store');
const { getMembershipStore } = await import('@/lib/membership/store');
const { applySolReadExpiry } = await import('@/lib/membership/sol');

function transferTx({ signatureReference, lamports, payer, err = null, inner = false }) {
  const ix = {
    program: 'system',
    parsed: {
      type: 'transfer',
      info: { source: payer, destination: TREASURY, lamports: Number(lamports) },
    },
  };
  return {
    blockTime: 1_700_000_000,
    meta: { err, innerInstructions: inner ? [{ index: 0, instructions: [ix] }] : [] },
    transaction: {
      message: {
        accountKeys: [
          { pubkey: payer, signer: true, writable: true },
          { pubkey: TREASURY, signer: false, writable: true },
          { pubkey: signatureReference, signer: false, writable: false },
        ],
        instructions: inner ? [] : [ix],
      },
    },
  };
}

function fakeRpc({ signatures = [], transactions = {} }) {
  const calls = [];
  return {
    url: 'stub://devnet',
    calls,
    async call(method, params) {
      calls.push(method);
      if (method === 'getSignaturesForAddress') return signatures;
      if (method === 'getTransaction') return transactions[params[0]] ?? null;
      throw new Error(`unexpected rpc method ${method}`);
    },
  };
}

test('base58 round-trips 32 bytes and validates Solana addresses', () => {
  const bytes = Uint8Array.from({ length: 32 }, (_, i) => i);
  assert.deepEqual([...base58Decode(base58Encode(bytes))], [...bytes]);
  assert.equal(isSolanaAddress(TREASURY), true);
  assert.equal(isSolanaAddress('not-an-address!!'), false);
  assert.equal(isSolanaAddress('0'), false);
});

test('lamportsToSol formats without scientific notation', () => {
  assert.equal(lamportsToSol(20_000_000n), '0.02');
  assert.equal(lamportsToSol(1n), '0.000000001');
  assert.equal(lamportsToSol(1_000_000_000n), '1');
});

test('buildSolanaPayUrl embeds treasury, amount and reference', () => {
  const config = readSolPayConfig();
  const url = buildSolanaPayUrl(config, LAMPORTS, 'refkey');
  assert.ok(url.startsWith(`solana:${TREASURY}?`));
  assert.ok(url.includes('amount=0.02'));
  assert.ok(url.includes('reference=refkey'));
});

test('extractPayment sums system transfers to treasury incl. inner instructions', () => {
  const reference = 'ref111';
  const payer = 'payer111';
  assert.equal(
    extractPayment(transferTx({ signatureReference: reference, lamports: LAMPORTS, payer }), TREASURY, reference)
      .lamports,
    LAMPORTS,
  );
  assert.equal(
    extractPayment(
      transferTx({ signatureReference: reference, lamports: LAMPORTS, payer, inner: true }),
      TREASURY,
      reference,
    ).lamports,
    LAMPORTS,
  );
  assert.equal(
    extractPayment(
      transferTx({ signatureReference: reference, lamports: LAMPORTS, payer, err: { InstructionError: [0, 'x'] } }),
      TREASURY,
      reference,
    ),
    null,
  );
  assert.equal(extractPayment(transferTx({ signatureReference: 'other', lamports: LAMPORTS, payer }), TREASURY, reference), null);
});

test('confirmSolPayment activates the plan on a valid transfer', async () => {
  const user = 'user-sol-1';
  const request = await createSolPayment(user, 'plus', 'monthly');
  assert.ok(isSolanaAddress(request.reference));
  const tx = transferTx({ signatureReference: request.reference, lamports: LAMPORTS, payer: 'payer-a' });
  const rpc = fakeRpc({ signatures: [{ signature: 'sig-ok', err: null }], transactions: { 'sig-ok': tx } });
  assert.deepEqual(await confirmSolPayment(request.reference, user, rpc), { state: 'paid' });
  const membership = await getMembershipStore().get(user);
  assert.equal(membership.plan, 'plus');
  assert.equal(membership.stripeCheckoutSessionId, 'sol:sig-ok');
  // Idempotent: a second poll does not fail or downgrade.
  assert.deepEqual(await confirmSolPayment(request.reference, user, rpc), { state: 'paid' });
});

test('confirmSolPayment ignores underpayments and unrelated transactions', async () => {
  const user = 'user-sol-2';
  const request = await createSolPayment(user, 'plus', 'monthly');
  const rpc = fakeRpc({
    signatures: [
      { signature: 'sig-dust', err: null },
      { signature: 'sig-failed', err: { InstructionError: [0, 'x'] } },
    ],
    transactions: {
      'sig-dust': transferTx({ signatureReference: request.reference, lamports: 1_000n, payer: 'payer-b' }),
    },
  });
  assert.deepEqual(await confirmSolPayment(request.reference, user, rpc), {
    state: 'underpaid',
    paidLamports: '1000',
  });
  const membership = await getMembershipStore().get(user);
  assert.equal(membership?.plan ?? 'free', 'free');
});

test('one signature cannot settle two payment requests', async () => {
  const request1 = await createSolPayment('user-sol-3', 'plus', 'monthly');
  const request2 = await createSolPayment('user-sol-3', 'plus', 'monthly');
  const tx = transferTx({ signatureReference: request1.reference, lamports: LAMPORTS, payer: 'payer-c' });
  // Same tx touches both references (accountKeys include both).
  tx.transaction.message.accountKeys.push({ pubkey: request2.reference, signer: false });
  const rpc = fakeRpc({
    signatures: [{ signature: 'sig-shared', err: null }],
    transactions: { 'sig-shared': tx },
  });
  assert.deepEqual(await confirmSolPayment(request1.reference, 'user-sol-3', rpc), { state: 'paid' });
  // extractPayment only requires the reference among account keys — but the
  // signature was already claimed, so the second request stays unsettled.
  const tx2 = transferTx({ signatureReference: request2.reference, lamports: LAMPORTS, payer: 'payer-c' });
  tx2.transaction.message.accountKeys = tx.transaction.message.accountKeys;
  const rpc2 = fakeRpc({
    signatures: [{ signature: 'sig-shared', err: null }],
    transactions: { 'sig-shared': tx2 },
  });
  const second = await confirmSolPayment(request2.reference, 'user-sol-3', rpc2);
  assert.notEqual(second.state, 'paid');
});

test('expired and foreign requests are refused', async () => {
  const store = getSolPaymentStore();
  const past = new Date(Date.now() - 1000).toISOString();
  await store.create({
    reference: 'expRef11111111111111111111111111111',
    userKey: 'user-sol-4',
    plan: 'plus',
    interval: 'monthly',
    lamports: '20000000',
    treasury: TREASURY,
    cluster: 'devnet',
    status: 'pending',
    signature: null,
    payer: null,
    expiresAt: past,
    createdAt: past,
    confirmedAt: null,
  });
  assert.deepEqual(await confirmSolPayment('expRef11111111111111111111111111111', 'user-sol-4', fakeRpc({})), {
    state: 'expired',
  });
  const request = await createSolPayment('user-sol-5', 'plus', 'monthly');
  assert.deepEqual(await confirmSolPayment(request.reference, 'other-user', fakeRpc({})), { state: 'forbidden' });
  assert.deepEqual(await confirmSolPayment('11111111111111111111111111111112', 'user-sol-5', fakeRpc({})), {
    state: 'missing',
  });
});

test('applySolReadExpiry downgrades one-time SOL plans after the period ends', () => {
  const base = {
    plan: 'pro',
    stripeCheckoutSessionId: 'sol:sig-x',
    subscriptionPeriodEnd: '2020-01-01T00:00:00.000Z',
  };
  assert.equal(applySolReadExpiry(base).plan, 'free');
  assert.equal(
    applySolReadExpiry({ ...base, subscriptionPeriodEnd: '2999-01-01T00:00:00.000Z' }).plan,
    'pro',
  );
  // Stripe-managed sessions are untouched (webhooks own their lifecycle).
  assert.equal(
    applySolReadExpiry({ ...base, stripeCheckoutSessionId: 'cs_live_x', subscriptionPeriodEnd: '2020-01-01T00:00:00.000Z' }).plan,
    'pro',
  );
  // A member with a live Stripe subscription is never downgraded, even when a
  // later SOL purchase overwrote the checkout-session anchor.
  assert.equal(
    applySolReadExpiry({
      ...base,
      stripeSubscriptionId: 'sub_live',
      subscriptionStatus: 'active',
    }).plan,
    'pro',
  );
});

test('a claimed payment retries activation on later polls', async () => {
  const user = 'user-sol-6';
  const request = await createSolPayment(user, 'plus', 'monthly');
  // Simulate: signature claimed, then the process died before activatePlan ran.
  assert.equal(
    await getSolPaymentStore().claimSignature(request.reference, 'sig-lost', 'payer-d'),
    'claimed',
  );
  const rpc = fakeRpc({ signatures: [{ signature: 'sig-lost', err: null }] });
  assert.deepEqual(await confirmSolPayment(request.reference, user, rpc), { state: 'paid' });
  const membership = await getMembershipStore().get(user);
  assert.equal(membership.plan, 'plus');
  assert.equal(membership.stripeCheckoutSessionId, 'sol:sig-lost');
});

test('solPayLamports rejects zero and precision-unsafe prices', () => {
  process.env.SOL_PAY_LAMPORTS_PRO_ANNUAL = '0';
  assert.throws(() => solPayLamports('pro', 'annual'), /must be positive/);
  process.env.SOL_PAY_LAMPORTS_PRO_ANNUAL = String(BigInt(Number.MAX_SAFE_INTEGER) + 1n);
  assert.throws(() => solPayLamports('pro', 'annual'), /safe integer/);
  delete process.env.SOL_PAY_LAMPORTS_PRO_ANNUAL;
  assert.equal(solPayLamports('pro', 'annual'), 500_000_000n);
});

test('SOL activation preserves a live Stripe subscription state', async () => {
  const store = getMembershipStore();
  const user = 'user-sol-stripe';
  // Active Stripe subscriber (periodEnd in the past — Stripe status still owns access).
  await store.activatePlan({
    userKey: user,
    plan: 'plus',
    stripeCheckoutSessionId: 'cs_stripe_1',
    stripeSubscriptionId: 'sub_live_1',
    subscriptionStatus: 'active',
    subscriptionPeriodEnd: '2020-01-01T00:00:00.000Z',
  });
  const request = await createSolPayment(user, 'pro', 'monthly');
  const tx = transferTx({ signatureReference: request.reference, lamports: 50_000_000n, payer: 'payer-e' });
  const rpc = fakeRpc({
    signatures: [{ signature: 'sig-stripe-member', err: null }],
    transactions: { 'sig-stripe-member': tx },
  });
  assert.deepEqual(await confirmSolPayment(request.reference, user, rpc), { state: 'paid' });
  const membership = await store.get(user);
  assert.equal(membership.plan, 'pro');
  assert.equal(membership.subscriptionStatus, 'active');
  assert.equal(membership.stripeSubscriptionId, 'sub_live_1');
});

test('the memory membership store applies SOL expiry outside get()', async () => {
  const store = getMembershipStore();
  const user = 'user-sol-expired';
  await store.activatePlan({
    userKey: user,
    plan: 'plus',
    stripeCheckoutSessionId: 'sol:expired-sig',
    subscriptionStatus: 'sol_one_time',
    subscriptionPeriodEnd: '2020-01-01T00:00:00.000Z',
  });
  const upserted = await store.upsert({ userKey: user });
  assert.equal(upserted.plan, 'free');
  // A re-activation via SOL compares against the expired (free) plan.
  const request = await createSolPayment(user, 'plus', 'monthly');
  const tx = transferTx({ signatureReference: request.reference, lamports: LAMPORTS, payer: 'payer-f' });
  const rpc = fakeRpc({
    signatures: [{ signature: 'sig-renew', err: null }],
    transactions: { 'sig-renew': tx },
  });
  await confirmSolPayment(request.reference, user, rpc);
  assert.equal((await store.get(user)).plan, 'plus');
});

test('anonymous SOL checkout is refused when auth is configured', async () => {
  globalThis.__testAuthConfigured = true;
  globalThis.__testUser = null;
  try {
    const { POST } = await import('@/app/api/sol/checkout/route');
    const res = await POST(
      new Request('https://test/api/sol/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'plus', interval: 'monthly' }),
      }),
    );
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error, 'demo_not_allowed');
  } finally {
    delete globalThis.__testAuthConfigured;
    delete globalThis.__testUser;
  }
});

test('an older settled request cannot roll back a newer activation', async () => {
  const store = getMembershipStore();
  const user = 'user-sol-order';
  // Older request created first, newer one second.
  const reqA = await createSolPayment(user, 'plus', 'monthly');
  const reqB = await createSolPayment(user, 'pro', 'annual');
  // The newer request settles and activates first.
  const txB = transferTx({ signatureReference: reqB.reference, lamports: 500_000_000n, payer: 'payer-g' });
  const rpcB = fakeRpc({
    signatures: [{ signature: 'sig-newer', err: null }],
    transactions: { 'sig-newer': txB },
  });
  assert.deepEqual(await confirmSolPayment(reqB.reference, user, rpcB), { state: 'paid' });
  const afterB = await store.get(user);
  assert.equal(afterB.plan, 'pro');
  const periodEndB = afterB.subscriptionPeriodEnd;
  // Now the older request settles on-chain (late scan path) — it must not
  // regress the newer activation's plan or period.
  const txA = transferTx({ signatureReference: reqA.reference, lamports: LAMPORTS, payer: 'payer-g' });
  const rpcA = fakeRpc({
    signatures: [{ signature: 'sig-older', err: null }],
    transactions: { 'sig-older': txA },
  });
  assert.deepEqual(await confirmSolPayment(reqA.reference, user, rpcA), { state: 'paid' });
  // Nor may a re-poll of the already-claimed older reference.
  assert.deepEqual(await confirmSolPayment(reqA.reference, user, rpcA), { state: 'paid' });
  const afterA = await store.get(user);
  assert.equal(afterA.plan, 'pro');
  assert.equal(afterA.subscriptionPeriodEnd, periodEndB);
  assert.equal(afterA.stripeCheckoutSessionId, 'sol:sig-newer');
});

test('the newer request still activates when the older one settles first', async () => {
  const store = getMembershipStore();
  const user = 'user-sol-order2';
  const reqA = await createSolPayment(user, 'plus', 'monthly');
  const reqB = await createSolPayment(user, 'pro', 'annual');
  // Older settles first.
  const txA = transferTx({ signatureReference: reqA.reference, lamports: LAMPORTS, payer: 'payer-h' });
  const rpcA = fakeRpc({
    signatures: [{ signature: 'sig-first', err: null }],
    transactions: { 'sig-first': txA },
  });
  assert.deepEqual(await confirmSolPayment(reqA.reference, user, rpcA), { state: 'paid' });
  assert.equal((await store.get(user)).plan, 'plus');
  // Newer settles second — it must win even though the older activated before it.
  const txB = transferTx({ signatureReference: reqB.reference, lamports: 500_000_000n, payer: 'payer-h' });
  const rpcB = fakeRpc({
    signatures: [{ signature: 'sig-second', err: null }],
    transactions: { 'sig-second': txB },
  });
  assert.deepEqual(await confirmSolPayment(reqB.reference, user, rpcB), { state: 'paid' });
  const membership = await store.get(user);
  assert.equal(membership.plan, 'pro');
  assert.equal(membership.stripeCheckoutSessionId, 'sol:sig-second');
  // And a re-poll of the older one still cannot regress it.
  assert.deepEqual(await confirmSolPayment(reqA.reference, user, rpcA), { state: 'paid' });
  assert.equal((await store.get(user)).stripeCheckoutSessionId, 'sol:sig-second');
});

test('paid members can complete onboarding without the plan picker flag', async () => {
  const user = 'user-sol-onboard';
  await getMembershipStore().activatePlan({
    userKey: user,
    plan: 'plus',
    stripeCheckoutSessionId: 'sol:onboard-sig',
    subscriptionStatus: 'sol_one_time',
    subscriptionPeriodEnd: '2999-01-01T00:00:00.000Z',
  });
  globalThis.__testUser = { id: user };
  try {
    const { PUT } = await import('@/app/api/onboarding/route');
    const res = await PUT(
      new Request('https://test/api/onboarding', {
        method: 'PUT',
        body: JSON.stringify({
          onboardingCompleted: true,
          profile: {
            firstName: 'Test',
            lastName: 'User',
            dob: '1990-01-01',
            gender: 'female',
            country: 'Spain',
            city: 'Barcelona',
          },
        }),
      }),
    );
    assert.equal(res.status, 200);
  } finally {
    delete globalThis.__testUser;
  }
});
