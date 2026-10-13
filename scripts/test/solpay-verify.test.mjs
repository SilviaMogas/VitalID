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
const { readSolPayConfig } = await import('@/lib/solpay/config');
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
});
