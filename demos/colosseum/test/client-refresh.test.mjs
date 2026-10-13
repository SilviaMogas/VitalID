import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createRefreshController, refreshInFinally, submitWithFreshRefresh,
} from '../src/refresh-controller.mjs';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return {promise, resolve, reject};
}

test('fresh status ignores an older active response and renders the new revoked state', async () => {
  const oldResponse = deferred();
  const newResponse = deferred();
  const newRequestStarted = deferred();
  const rendered = [];
  let fetches = 0;
  const controller = createRefreshController({
    fetchStatus() {
      fetches += 1;
      if (fetches === 1) return oldResponse.promise;
      newRequestStarted.resolve();
      return newResponse.promise;
    },
    render: state => rendered.push(state),
    renderUnavailable: () => assert.fail('No status request should fail'),
    onFreshStart: () => {},
  });

  const oldRefresh = controller.refresh();
  const freshRefresh = controller.refresh({fresh: true});
  assert.equal(controller.generation, 1);
  oldResponse.resolve({permission: 'active'});
  await newRequestStarted.promise;
  newResponse.resolve({permission: 'revoked'});
  await Promise.all([oldRefresh, freshRefresh]);

  assert.equal(fetches, 2);
  assert.deepEqual(rendered, [{permission: 'revoked'}]);
});

test('an obsolete rejected request does not block or clear the fresh result', async () => {
  const oldResponse = deferred();
  const newRequestStarted = deferred();
  const rendered = [];
  const errors = [];
  let fetches = 0;
  const controller = createRefreshController({
    fetchStatus() {
      fetches += 1;
      if (fetches === 1) return oldResponse.promise;
      newRequestStarted.resolve();
      return Promise.resolve({permission: 'current'});
    },
    render: state => rendered.push(state),
    renderUnavailable: result => errors.push(result.error),
    onFreshStart: () => {},
  });

  const oldRefresh = controller.refresh();
  const freshRefresh = controller.refresh({fresh: true});
  oldResponse.reject(new Error('obsolete request failed'));
  await newRequestStarted.promise;
  await Promise.all([oldRefresh, freshRefresh]);

  assert.equal(fetches, 2);
  assert.deepEqual(rendered, [{permission: 'current'}]);
  assert.deepEqual(errors, []);
});

test('a failed fresh status request leaves no active cards and reports unavailable', async () => {
  let cards = [];
  let statusMessage = '';
  let fetches = 0;
  const controller = createRefreshController({
    async fetchStatus() {
      fetches += 1;
      if (fetches === 1) return {permissions: ['active']};
      throw new Error('status unavailable');
    },
    render: state => {
      cards = state.permissions;
      statusMessage = 'Current state';
    },
    renderUnavailable: ({fresh}) => {
      statusMessage = 'Permission state unavailable';
      if (fresh) cards = [];
    },
    onFreshStart: () => {
      cards = [];
      statusMessage = 'Refreshing current permission state…';
    },
  });

  await controller.refresh();
  assert.deepEqual(cards, ['active']);
  await assert.rejects(controller.refresh({fresh: true}), /status unavailable/);

  assert.deepEqual(cards, []);
  assert.equal(statusMessage, 'Permission state unavailable');
});

test('overlapping ordinary status polls share one fetch', async () => {
  const response = deferred();
  let fetches = 0;
  const controller = createRefreshController({
    fetchStatus() {
      fetches += 1;
      return response.promise;
    },
    render: () => {},
    renderUnavailable: () => {},
    onFreshStart: () => {},
  });

  const first = controller.refresh();
  const second = controller.refresh();
  assert.strictEqual(second, first);
  assert.equal(fetches, 1);
  response.resolve({permissions: []});
  await Promise.all([first, second]);
});

test('overlapping fresh requests wait for the old request and coalesce without parallel fetches', async () => {
  const oldResponse = deferred();
  const freshResponse = deferred();
  const freshRequestStarted = deferred();
  let fetches = 0;
  let activeFetches = 0;
  let maxActiveFetches = 0;
  const controller = createRefreshController({
    fetchStatus() {
      fetches += 1;
      activeFetches += 1;
      maxActiveFetches = Math.max(maxActiveFetches, activeFetches);
      const response = fetches === 1 ? oldResponse.promise : freshResponse.promise;
      if (fetches === 2) freshRequestStarted.resolve();
      return response.finally(() => { activeFetches -= 1; });
    },
    render: () => {},
    renderUnavailable: () => {},
    onFreshStart: () => {},
  });

  const oldRefresh = controller.refresh();
  const firstFresh = controller.refresh({fresh: true});
  const secondFresh = controller.refresh({fresh: true});
  assert.strictEqual(secondFresh, firstFresh);
  assert.equal(fetches, 1);
  oldResponse.resolve({permissions: ['old']});
  await freshRequestStarted.promise;
  assert.equal(fetches, 2);
  assert.equal(maxActiveFetches, 1);
  freshResponse.resolve({permissions: ['new']});
  await Promise.all([oldRefresh, firstFresh, secondFresh]);

  assert.equal(fetches, 2);
  assert.equal(maxActiveFetches, 1);
});

test('successful create submission requests a fresh status refresh', async () => {
  const events = [];
  const result = await submitWithFreshRefresh(
    async () => {
      events.push('submitted');
      return 'receipt';
    },
    async options => { events.push(options); },
    () => events.push('consent-cleared'),
  );

  assert.equal(result, 'receipt');
  assert.deepEqual(events, ['submitted', 'consent-cleared', {fresh: true}]);
});

test('revoke requests a fresh status refresh in finally after signing failure', async () => {
  let refreshOptions;
  await assert.rejects(
    refreshInFinally(async () => { throw new Error('signing failed'); }, async options => {
      refreshOptions = options;
    }),
    /signing failed/,
  );
  assert.deepEqual(refreshOptions, {fresh: true});
});
