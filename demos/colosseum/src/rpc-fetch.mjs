const DEVNET_RPC_ORIGIN = 'https://api.devnet.solana.com';
const READ_METHODS = new Set([
  'getGenesisHash',
  'getAccountInfo',
  'getLatestBlockhash',
  'getBlockHeight',
  'getSignatureStatuses',
]);
const REQUEST_TIMEOUT_MS = 12_000;
const MIN_RETRY_AFTER_MS = 10_000;
const MAX_RETRY_AFTER_MS = 30_000;
const MAX_QUEUE_WAIT_MS = 30_000;
const MAX_QUEUED_REQUESTS = 64;
const NEVER = new Promise(() => {});

function defaultSleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function queueDeadline(sleep) {
  if (sleep === defaultSleep) {
    let timer;
    const promise = new Promise(resolve => {
      timer = setTimeout(() => {
        timer = undefined;
        resolve('deadline');
      }, MAX_QUEUE_WAIT_MS);
    });
    return {
      promise,
      dispose() {
        if (timer !== undefined) {
          clearTimeout(timer);
          timer = undefined;
        }
      },
    };
  }

  return {
    promise: Promise.resolve().then(() => sleep(MAX_QUEUE_WAIT_MS)).then(() => 'deadline'),
    dispose() {},
  };
}

function unavailable(message) {
  return new Error(`Devnet RPC unavailable: ${message}`);
}

function isOfficialRpc(input) {
  try {
    const value = typeof input === 'string' || input instanceof URL
      ? input
      : typeof Request !== 'undefined' && input instanceof Request
        ? input.url
        : null;
    if (value === null) return false;
    const url = new URL(value);
    return url.origin === DEVNET_RPC_ORIGIN
      && !url.username
      && !url.password
      && url.pathname === '/'
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}

function bodyText(body) {
  if (typeof body === 'string') return body;
  if (body instanceof Uint8Array) return new TextDecoder().decode(body);
  if (body instanceof ArrayBuffer) return new TextDecoder().decode(new Uint8Array(body));
  return null;
}

function rpcMethod(body) {
  const text = bodyText(body);
  if (text === null) return null;
  try {
    const request = JSON.parse(text);
    return !Array.isArray(request) && typeof request?.method === 'string'
      ? request.method
      : null;
  } catch {
    return null;
  }
}

function callerSignal(input, init) {
  if (init && Object.hasOwn(init, 'signal')) return init.signal ?? undefined;
  return typeof Request !== 'undefined' && input instanceof Request ? input.signal : undefined;
}

function abortWait(signal) {
  if (!signal) return {promise: NEVER, dispose() {}};
  if (signal.aborted) return {promise: Promise.resolve('aborted'), dispose() {}};
  let listener;
  const promise = new Promise(resolve => {
    listener = () => resolve('aborted');
    signal.addEventListener('abort', listener, {once: true});
  });
  return {
    promise,
    dispose() {
      signal.removeEventListener('abort', listener);
    },
  };
}

function abortReason(signal) {
  return signal?.reason ?? new DOMException('The operation was aborted.', 'AbortError');
}

async function waitFor(promise, deadline, signal) {
  const abort = abortWait(signal);
  try {
    const result = await Promise.race([
      Promise.resolve(promise).then(() => 'ready'),
      deadline,
      abort.promise,
    ]);
    if (result === 'ready') return;
    if (result === 'deadline') throw unavailable('request queue wait exceeded 30 seconds.');
    throw abortReason(signal);
  } finally {
    abort.dispose();
  }
}

async function waitForDelay(ms, sleep, signal) {
  const abort = abortWait(signal);
  try {
    const result = await Promise.race([
      Promise.resolve().then(() => sleep(ms)).then(() => 'ready'),
      abort.promise,
    ]);
    if (result === 'aborted') throw abortReason(signal);
  } finally {
    abort.dispose();
  }
}

function attemptSignal(signal) {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function retryDelay(response, now) {
  const header = response.headers?.get?.('retry-after');
  if (header === null || header === undefined) return MIN_RETRY_AFTER_MS;
  const value = header.trim();
  let requested;
  if (/^\d+$/.test(value)) {
    requested = Number(value) * 1000;
  } else {
    const retryAt = Date.parse(value);
    if (!Number.isFinite(retryAt)) return MIN_RETRY_AFTER_MS;
    requested = Math.max(0, retryAt - now);
  }
  return Math.max(MIN_RETRY_AFTER_MS, requested);
}

export function createDevnetFetch({
  fetchImpl = globalThis.fetch,
  now = Date.now,
  sleep = defaultSleep,
  minIntervalMs = 500,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function.');
  if (typeof now !== 'function') throw new TypeError('now must be a function.');
  if (typeof sleep !== 'function') throw new TypeError('sleep must be a function.');
  if (!Number.isFinite(minIntervalMs) || minIntervalMs < 0) {
    throw new TypeError('minIntervalMs must be a non-negative number.');
  }

  let tail = Promise.resolve();
  let queued = 0;
  let active = false;
  let lastAttemptAt = -Infinity;

  return async function devnetFetch(input, init = {}) {
    init ??= {};
    if (!isOfficialRpc(input)) throw unavailable('unsupported RPC endpoint.');
    if (queued >= MAX_QUEUED_REQUESTS) throw unavailable('request queue is full.');

    const signal = callerSignal(input, init);
    const method = rpcMethod(init.body);
    const queuedAt = now();
    const spacing = Math.max(0, lastAttemptAt + minIntervalMs - queuedAt);
    const needsQueueWait = active || queued > 0 || spacing > 0;
    const deadline = needsQueueWait
      ? queueDeadline(sleep)
      : {promise: NEVER, dispose() {}};
    const previous = tail;
    let releaseGate;
    const gate = new Promise(resolve => { releaseGate = resolve; });
    tail = previous.catch(() => {}).then(() => gate);

    queued += 1;
    let pendingCounted = true;
    let slotReleased = false;
    let hasTurn = false;
    let started = false;
    const decrementQueue = () => {
      if (!pendingCounted) return;
      pendingCounted = false;
      queued -= 1;
    };
    const releaseNow = () => {
      if (slotReleased) return;
      slotReleased = true;
      decrementQueue();
      releaseGate();
    };
    const releaseAfterPrevious = () => {
      if (slotReleased) return;
      slotReleased = true;
      void previous.catch(() => {}).then(() => {
        decrementQueue();
        releaseGate();
      });
    };

    try {
      await waitFor(previous, deadline.promise, signal);
      hasTurn = true;

      const waitMs = Math.max(0, lastAttemptAt + minIntervalMs - now());
      if (waitMs > 0) await waitFor(sleep(waitMs), deadline.promise, signal);
      deadline.dispose();
      if (now() - queuedAt >= MAX_QUEUE_WAIT_MS) {
        throw unavailable('request queue wait exceeded 30 seconds.');
      }

      decrementQueue();
      active = true;
      started = true;
      let attempts = 0;
      while (true) {
        lastAttemptAt = now();
        const response = await fetchImpl(input, {
          ...init,
          signal: attemptSignal(signal),
        });
        attempts += 1;
        if (response.status !== 429 || !READ_METHODS.has(method) || attempts >= 2) {
          return response;
        }

        const delay = retryDelay(response, now());
        if (delay > MAX_RETRY_AFTER_MS) return response;
        await response.arrayBuffer();
        await waitForDelay(delay, sleep, signal);
      }
    } catch (error) {
      if (!slotReleased) {
        if (hasTurn) releaseNow();
        else releaseAfterPrevious();
      }
      throw error;
    } finally {
      deadline.dispose();
      if (started) active = false;
      if (hasTurn && !slotReleased) {
        slotReleased = true;
        releaseGate();
      }
    }
  };
}
