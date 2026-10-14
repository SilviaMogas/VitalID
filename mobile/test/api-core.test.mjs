import test from "node:test";
import assert from "node:assert/strict";

const { ApiError, createApiTransport, validateApiOrigin, validateApiPath } =
  await import("../src/api-core.ts");

function response(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function fakeStorage(initial = null) {
  let value = initial;
  const writes = [];
  return {
    writes,
    get: async () => value,
    set: async (next) => { writes.push(["set", next]); value = next; },
    clear: async () => { writes.push(["clear"]); value = null; },
    value: () => value,
  };
}

function session(accessToken = "access-1", refreshToken = "refresh-1", expiresAt = 4102444800) {
  return { accessToken, refreshToken, expiresAt, user: { id: "user-a", email: "a@example.test" } };
}

test("origin and relative path validation reject unsafe inputs", () => {
  assert.equal(validateApiOrigin("https://www.vitalid.site"), "https://www.vitalid.site");
  assert.equal(validateApiOrigin("http://10.0.2.2", true), "http://10.0.2.2");
  assert.throws(() => validateApiOrigin("http://10.0.2.2", false));
  assert.doesNotThrow(() => createApiTransport({
    origin: "http://10.0.2.2",
    development: true,
    storage: fakeStorage(),
  }));
  assert.throws(() => validateApiOrigin("https://vitalid.site/path"));
  assert.throws(() => validateApiOrigin("https://user:pass@vitalid.site"));
  assert.throws(() => validateApiOrigin("https://vitalid.site?secret=1"));
  assert.equal(validateApiPath("shares/abc_123/revoke"), "shares/abc_123/revoke");
  for (const path of ["/account", "https://evil.test/account", "shares/../account", "shares/a?x=1", "admin"]) {
    assert.throws(() => validateApiPath(path));
  }
});

test("refresh is single-flight and proactive", async () => {
  let now = 1000;
  let refreshCalls = 0;
  const storage = fakeStorage();
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  const transport = createApiTransport({
    origin: "https://www.vitalid.site",
    storage,
    now: () => now * 1000,
    fetcher: async (_url, init) => {
      const body = init.body ? JSON.parse(init.body) : null;
      if (body?.email) return response(200, session("access-1", "refresh-1", 1001));
      if (body?.refreshToken) {
        refreshCalls++;
        await held;
        return response(200, session("access-2", "refresh-2", 5000));
      }
      return response(200, { ok: true });
    },
  });
  await transport.signIn("a@example.test", "password");
  now = 2000;
  const one = transport.request("account");
  const two = transport.request("account");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(refreshCalls, 1);
  release();
  await Promise.all([one, two]);
  assert.equal(storage.value(), "refresh-2");
});

test("invalid refresh clears credentials, transient refresh preserves them", async () => {
  const invalidStore = fakeStorage("refresh-1");
  const invalid = createApiTransport({
    origin: "https://www.vitalid.site",
    storage: invalidStore,
    fetcher: async (_url, init) => init.body && JSON.parse(init.body).refreshToken
      ? response(401, { error: "unauthenticated" }) : response(200, session()),
  });
  assert.equal(await invalid.restore(), false);
  assert.equal(invalidStore.value(), null);

  const transientStore = fakeStorage("refresh-1");
  const transient = createApiTransport({
    origin: "https://www.vitalid.site",
    storage: transientStore,
    fetcher: async () => response(503, { error: "unavailable" }),
  });
  await assert.rejects(() => transient.restore(), (error) =>
    error instanceof ApiError && error.status === 503 && error.code === "unavailable");
  assert.equal(transientStore.value(), "refresh-1");
});

test("network failure never retries a POST", async () => {
  let calls = 0;
  const storage = fakeStorage();
  const transport = createApiTransport({
    origin: "https://www.vitalid.site",
    storage,
    fetcher: async (_url, init) => {
      calls++;
      if (init.body && JSON.parse(init.body).email) return response(200, session());
      throw new TypeError("offline");
    },
  });
  await transport.signIn("a@example.test", "password");
  await assert.rejects(() => transport.request("shares", { method: "POST", body: { purpose: "custom" } }));
  assert.equal(calls, 2);
});

test("forwards an explicit POST method when the body is absent", async () => {
  const methods = [];
  const transport = createApiTransport({
    origin: "https://www.vitalid.site",
    storage: fakeStorage(),
    fetcher: async (_url, init) => {
      methods.push([init.method, init.body]);
      const body = init.body ? JSON.parse(init.body) : null;
      return body?.email ? response(200, session()) : response(200, { revoked: true });
    },
  });
  await transport.signIn("a@example.test", "password");
  await transport.request("shares/abc/revoke", { method: "POST" });
  assert.deepEqual(methods.at(-1), ["POST", undefined]);
});

test("a delayed response from an old generation cannot update the session", async () => {
  const storage = fakeStorage();
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  let accountCall = false;
  const transport = createApiTransport({
    origin: "https://www.vitalid.site",
    storage,
    fetcher: async (_url, init) => {
      const body = init.body ? JSON.parse(init.body) : null;
      if (body?.email) return response(200, session(
        body.email.startsWith("b") ? "access-b" : "access-a",
        body.email.startsWith("b") ? "refresh-b" : "refresh-a",
      ));
      if (_url.endsWith("/account")) {
        accountCall = true;
        await held;
        return response(200, { user: "old-account" });
      }
      return response(200, { ok: true });
    },
  });
  await transport.signIn("a@example.test", "password");
  const oldRequest = transport.request("account");
  while (!accountCall) await new Promise((resolve) => setTimeout(resolve, 0));
  await transport.signOut();
  await transport.signIn("b@example.test", "password");
  release();
  await assert.rejects(() => oldRequest, (error) =>
    error instanceof ApiError && error.code === "session_changed");
  assert.equal(storage.value(), "refresh-b");
});

test("a delayed old 401 cannot refresh or clear a newer account", async () => {
  const storage = fakeStorage();
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  let oldCall = false;
  let refreshCalls = 0;
  const transport = createApiTransport({
    origin: "https://www.vitalid.site",
    storage,
    fetcher: async (_url, init) => {
      const body = init.body ? JSON.parse(init.body) : null;
      if (body?.email) return response(200, session(
        body.email.startsWith("b") ? "access-b" : "access-a",
        body.email.startsWith("b") ? "refresh-b" : "refresh-a",
      ));
      if (body?.refreshToken) {
        refreshCalls++;
        return response(200, session("access-refreshed", "refresh-refreshed"));
      }
      if (_url.endsWith("/account")) {
        oldCall = true;
        await held;
        return response(401, { error: "unauthenticated" });
      }
      return response(200, { ok: true });
    },
  });
  await transport.signIn("a@example.test", "password");
  const oldRequest = transport.request("account");
  while (!oldCall) await new Promise((resolve) => setTimeout(resolve, 0));
  await transport.signIn("b@example.test", "password");
  release();
  await assert.rejects(() => oldRequest, (error) =>
    error instanceof ApiError && error.code === "session_changed");
  assert.equal(refreshCalls, 0);
  assert.equal(storage.value(), "refresh-b");
});

test("logout invalidates pending sign-in and serializes late storage writes", async () => {
  const storage = fakeStorage();
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  let signInCall = false;
  const transport = createApiTransport({
    origin: "https://www.vitalid.site",
    storage,
    fetcher: async (_url, init) => {
      const body = init.body ? JSON.parse(init.body) : null;
      if (body?.email) {
        signInCall = true;
        await held;
        return response(200, session());
      }
      return response(200, { ok: true });
    },
  });
  const pending = transport.signIn("a@example.test", "password");
  while (!signInCall) await new Promise((resolve) => setTimeout(resolve, 0));
  await transport.signOut();
  release();
  await assert.rejects(() => pending, (error) => error instanceof ApiError && error.code === "session_changed");
  assert.equal(storage.value(), null);
  assert.deepEqual(storage.writes.at(-1), ["clear"]);
});

test("logout racing restore cannot resurrect a refreshed session", async () => {
  const storage = fakeStorage("refresh-1");
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  const transport = createApiTransport({
    origin: "https://www.vitalid.site",
    storage,
    fetcher: async () => {
      await held;
      return response(200, session("late-access", "late-refresh"));
    },
  });
  const pending = transport.restore();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await transport.signOut();
  release();
  await assert.rejects(() => pending, (error) => error instanceof ApiError && error.code === "session_changed");
  assert.equal(storage.value(), null);
});
