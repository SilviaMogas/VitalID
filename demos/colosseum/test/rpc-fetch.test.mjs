import assert from 'node:assert/strict';
import test from 'node:test';
import {createDevnetFetch} from '../src/rpc-fetch.mjs';

const endpoint = 'https://api.devnet.solana.com';
const body = method => JSON.stringify({jsonrpc: '2.0', id: 1, method, params: []});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return {promise, resolve, reject};
}

function fakeClock(start = 0) {
  let time = start;
  const sleepers = [];
  return {
    now: () => time,
    sleep(ms) {
      return new Promise(resolve => sleepers.push({
        ms,
        resolve() {
          time += ms;
          resolve();
        },
      }));
    },
    pending(ms) {
      return sleepers.filter(item => item.ms === ms).length;
    },
    advance(ms) {
      const index = sleepers.findIndex(item => item.ms === ms);
      assert.notEqual(index, -1, `no pending ${ms}ms sleep`);
      sleepers.splice(index, 1)[0].resolve();
    },
    advanceAll(ms) {
      const due = sleepers.filter(item => item.ms === ms);
      assert.ok(due.length, `no pending ${ms}ms sleeps`);
      for (let index = sleepers.length - 1; index >= 0; index -= 1) {
        if (sleepers[index].ms === ms) sleepers.splice(index, 1);
      }
      time += ms;
      due.forEach(item => item.resolve());
    },
  };
}

async function waitUntil(predicate) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.fail('condition did not become true');
}

test('serializes concurrent requests and spaces attempts by at least 500ms', async () => {
  const clock = fakeClock();
  const firstResponse = deferred();
  const starts = [];
  const fetchImpl = async (_url, init) => {
    starts.push(clock.now());
    assert.ok(init.signal instanceof AbortSignal);
    if (starts.length === 1) return firstResponse.promise;
    return new Response('second');
  };
  const fetch = createDevnetFetch({fetchImpl, now: clock.now, sleep: clock.sleep});
  const first = fetch(endpoint, {body: body('getGenesisHash')});
  const second = fetch(endpoint, {body: body('getAccountInfo')});

  await waitUntil(() => starts.length === 1);
  assert.deepEqual(starts, [0]);
  firstResponse.resolve(new Response('first'));
  await waitUntil(() => clock.pending(500) === 1);
  assert.deepEqual(starts, [0]);
  clock.advance(500);

  const [firstResult, secondResult] = await Promise.all([first, second]);
  assert.equal(await firstResult.text(), 'first');
  assert.equal(await secondResult.text(), 'second');
  assert.deepEqual(starts, [0, 500]);
});

test('a rejected fetch releases the serialized queue', async () => {
  const clock = fakeClock();
  const starts = [];
  const fetchImpl = async () => {
    starts.push(clock.now());
    if (starts.length === 1) throw new Error('network failure');
    return new Response('recovered');
  };
  const fetch = createDevnetFetch({fetchImpl, now: clock.now, sleep: clock.sleep});
  const first = fetch(endpoint, {body: body('getGenesisHash')});
  const second = fetch(endpoint, {body: body('getAccountInfo')});

  await assert.rejects(first, /network failure/);
  await waitUntil(() => clock.pending(500) === 1);
  clock.advance(500);
  assert.equal(await (await second).text(), 'recovered');
  assert.deepEqual(starts, [0, 500]);
});

test('retries an allowlisted read once after draining a 429 body and honors Retry-After', async () => {
  const clock = fakeClock(1_000);
  const limited = new Response('limited', {status: 429, headers: {'retry-after': '2'}});
  const accepted = new Response('accepted');
  const signals = [];
  let calls = 0;
  const fetch = createDevnetFetch({
    fetchImpl: async (_url, init) => {
      signals.push(init.signal);
      calls += 1;
      return calls === 1 ? limited : accepted;
    },
    now: clock.now,
    sleep: clock.sleep,
    minIntervalMs: 0,
  });
  const result = fetch(endpoint, {body: body('getSignatureStatuses')});

  await waitUntil(() => clock.pending(10_000) === 1);
  assert.equal(limited.bodyUsed, true);
  clock.advance(10_000);
  assert.equal(await result, accepted);
  assert.equal(calls, 2);
  assert.notEqual(signals[0], signals[1]);
});

test('parses HTTP-date Retry-After and applies the ten-second minimum', async () => {
  const clock = fakeClock(Date.parse('2026-10-13T05:00:00.000Z'));
  const retryAt = new Date(clock.now() + 15_000).toUTCString();
  const limited = new Response('limited', {status: 429, headers: {'retry-after': retryAt}});
  let calls = 0;
  const accepted = new Response('accepted');
  const fetch = createDevnetFetch({
    fetchImpl: async () => (++calls === 1 ? limited : accepted),
    now: clock.now,
    sleep: clock.sleep,
    minIntervalMs: 0,
  });
  const result = fetch(endpoint, {body: body('getAccountInfo')});

  await waitUntil(() => clock.pending(15_000) === 1);
  clock.advance(15_000);
  assert.equal(await result, accepted);
  assert.equal(calls, 2);
});

test('does not retry a read when Retry-After exceeds thirty seconds', async () => {
  const limited = new Response('still rate limited', {
    status: 429,
    headers: {'retry-after': '31'},
  });
  let calls = 0;
  const fetch = createDevnetFetch({
    fetchImpl: async () => {
      calls += 1;
      return limited;
    },
    minIntervalMs: 0,
  });

  assert.equal(await fetch(endpoint, {body: body('getGenesisHash')}), limited);
  assert.equal(await limited.text(), 'still rate limited');
  assert.equal(calls, 1);
});

test('returns the second 429 response without a third attempt', async () => {
  const clock = fakeClock();
  const first = new Response('first limited', {status: 429});
  const second = new Response('second limited', {status: 429});
  let calls = 0;
  const fetch = createDevnetFetch({
    fetchImpl: async () => (++calls === 1 ? first : second),
    now: clock.now,
    sleep: clock.sleep,
    minIntervalMs: 0,
  });
  const result = fetch(endpoint, {body: body('getBlockHeight')});

  await waitUntil(() => clock.pending(10_000) === 1);
  clock.advance(10_000);
  assert.equal(await result, second);
  assert.equal(calls, 2);
  assert.equal(second.bodyUsed, false);
});

test('never retries sends, simulations, unknown methods, non-429, or RPC-level errors', async () => {
  for (const method of ['sendTransaction', 'simulateTransaction', 'unknownMethod']) {
    const response = new Response('limited', {status: 429});
    let calls = 0;
    const fetch = createDevnetFetch({
      fetchImpl: async () => {
        calls += 1;
        return response;
      },
      minIntervalMs: 0,
    });
    assert.equal(await fetch(endpoint, {body: body(method)}), response);
    assert.equal(calls, 1);
  }

  for (const response of [
    new Response('server error', {status: 503}),
    new Response(JSON.stringify({jsonrpc: '2.0', id: 1, error: {code: 429}}), {status: 200}),
  ]) {
    let calls = 0;
    const fetch = createDevnetFetch({
      fetchImpl: async () => {
        calls += 1;
        return response;
      },
      minIntervalMs: 0,
    });
    assert.equal(await fetch(endpoint, {body: body('getGenesisHash')}), response);
    assert.equal(calls, 1);
  }
});

test('preserves abort propagation and never retries network or timeout failures', async () => {
  const controller = new AbortController();
  let seenSignal;
  let calls = 0;
  const fetch = createDevnetFetch({
    fetchImpl: async (_url, init) => {
      calls += 1;
      seenSignal = init.signal;
      controller.abort(new Error('caller aborted'));
      throw seenSignal.reason;
    },
    minIntervalMs: 0,
  });
  await assert.rejects(fetch(endpoint, {
    body: body('getGenesisHash'),
    signal: controller.signal,
  }), /caller aborted/);
  assert.notEqual(seenSignal, controller.signal);
  assert.equal(seenSignal.aborted, true);
  assert.equal(calls, 1);

  let timeoutCalls = 0;
  const timeoutFetch = createDevnetFetch({
    fetchImpl: async () => {
      timeoutCalls += 1;
      throw new DOMException('request timed out', 'TimeoutError');
    },
    minIntervalMs: 0,
  });
  await assert.rejects(timeoutFetch(endpoint, {body: body('getGenesisHash')}), /request timed out/);
  assert.equal(timeoutCalls, 1);
});

test('rejects non-official RPC endpoints before fetching', async () => {
  let calls = 0;
  const fetch = createDevnetFetch({
    fetchImpl: async () => {
      calls += 1;
      return new Response('unexpected');
    },
    minIntervalMs: 0,
  });
  await assert.rejects(
    fetch('https://rpc.example.com', {body: body('getGenesisHash')}),
    /unsupported RPC endpoint/,
  );
  assert.equal(calls, 0);
});

test('caps queued requests at 64 and rejects requests waiting beyond thirty seconds', async () => {
  const clock = fakeClock();
  const firstResponse = deferred();
  let calls = 0;
  const fetch = createDevnetFetch({
    fetchImpl: async () => {
      calls += 1;
      return firstResponse.promise;
    },
    now: clock.now,
    sleep: clock.sleep,
    minIntervalMs: 0,
  });
  const active = fetch(endpoint, {body: body('getGenesisHash')});
  await waitUntil(() => calls === 1);
  const waiting = Array.from({length: 64}, () => fetch(endpoint, {body: body('getAccountInfo')}));
  await assert.rejects(
    fetch(endpoint, {body: body('getAccountInfo')}),
    /request queue is full/,
  );
  await waitUntil(() => clock.pending(30_000) === 64);
  clock.advanceAll(30_000);
  const results = await Promise.allSettled(waiting);
  assert.ok(results.every(result => result.status === 'rejected'
    && /request queue wait exceeded 30 seconds/.test(result.reason.message)));
  assert.equal(calls, 1);
  firstResponse.resolve(new Response('done'));
  assert.equal(await (await active).text(), 'done');
});
