import test from "node:test";
import assert from "node:assert/strict";

process.env.SUPABASE_URL = "https://supabase.local.test";
process.env.SUPABASE_SECRET_KEY = "synthetic-service-key";
process.env.NODE_ENV = "test";

const users = {
  "token-a": { id: "00000000-0000-4000-8000-00000000000a", email: "a@example.test" },
  "token-b": { id: "00000000-0000-4000-8000-00000000000b", email: "b@example.test" },
  "token-c": { id: "00000000-0000-4000-8000-00000000000c", email: "c@example.test" },
};
globalThis.__mobileAuthUsers = users;
globalThis.__mobilePlans = {};
globalThis.__mobileSetups = {};
globalThis.__mobileConsents = new Map();
globalThis.__mobileShares = new Map();
globalThis.__mobileUsersByEmail = Object.fromEntries(Object.values(users).map((user) => [user.email, user]));
globalThis.__mobileCredentials = {
  "a@example.test": {
    password: "correct-password",
    user: users["token-a"],
    session: { access_token: "token-a", refresh_token: "refresh-a", expires_at: 4102444800 },
  },
};
globalThis.__mobileRefreshes = {
  "refresh-a": {
    user: users["token-a"],
    session: { access_token: "token-a", refresh_token: "refresh-a", expires_at: 4102444800 },
  },
};

const route = await import("@/app/api/mobile/v1/[...path]/route");
const { CONSENT_POLICY_VERSIONS } = await import("@/lib/legal");

function grant(userId, versions = CONSENT_POLICY_VERSIONS) {
  const records = {};
  for (const [type, policyVersion] of Object.entries(versions)) {
    records[type] = { type, policyVersion, consentedAt: new Date().toISOString() };
  }
  globalThis.__mobileConsents.set(userId, records);
}

function request(path, { method = "GET", token, body, origin, cookies = false } = {}) {
  const headers = { host: "mobile.example.test" };
  if (token) headers.authorization = `Bearer ${token}`;
  if (origin) headers.origin = origin;
  if (cookies) globalThis.__mobileCookies = { vitalid_at: "token-a" };
  const init = { method, headers };
  if (body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return new Request(`https://mobile.example.test/api/mobile/v1/${path}`, init);
}

async function call(method, path, options = {}) {
  return route[method](request(path, { ...options, method }), {
    params: Promise.resolve({ path: path.split("/") }),
  });
}

async function body(response) {
  return response.json();
}

function resetData() {
  globalThis.__mobileShares.clear();
  globalThis.__mobileConsents.clear();
  globalThis.__mobileCookies = {};
  globalThis.__mobileSignoutError = null;
  grant(users["token-a"].id);
  grant(users["token-b"].id);
  grant(users["token-c"].id);
}

resetData();

test("missing or invalid bearer never falls back to a valid member cookie", async () => {
  globalThis.__mobileCookies = { vitalid_at: "token-a" };
  const missing = await call("GET", "account", { cookies: true });
  assert.equal(missing.status, 401);
  const invalid = await call("GET", "account", { token: "not-a-token", cookies: true });
  assert.equal(invalid.status, 401);
  assert.equal((await body(invalid)).error, "unauthenticated");
});

test("foreign origins are denied without wildcard CORS", async () => {
  const response = await call("GET", "account", { token: "token-a", origin: "https://evil.example" });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("two concurrent authenticated accounts remain isolated", async () => {
  const [a, b] = await Promise.all([
    call("GET", "account", { token: "token-a" }),
    call("GET", "account", { token: "token-b" }),
  ]);
  assert.equal((await body(a)).user.id, users["token-a"].id);
  assert.equal((await body(b)).user.id, users["token-b"].id);
});

test("identity is member-only and returns an allowlisted projection", async () => {
  const response = await call("GET", "identity", { token: "token-a" });
  assert.equal(response.status, 200);
  const value = await body(response);
  assert.equal(value.snapshot.identity.fullName, "Vital ID member");
  assert.equal("metrics" in value.snapshot, false);
  assert.equal("history" in value.snapshot, false);
});

test("stale consent blocks health reads and creation but permits revoke", async () => {
  const stale = { ...CONSENT_POLICY_VERSIONS, health_data: "old-version" };
  grant(users["token-a"].id, stale);
  const identity = await call("GET", "identity", { token: "token-a" });
  assert.equal(identity.status, 403);
  assert.equal((await body(identity)).error, "consent_required");
  const preview = await call("POST", "shares/preview", {
    token: "token-a",
    body: { selectedFields: ["identity"] },
  });
  assert.equal(preview.status, 403);
  const create = await call("POST", "shares", {
    token: "token-a",
    body: {
      purpose: "custom",
      selectedFields: ["identity"],
      durationMinutes: 60,
      recipientUserId: users["token-b"].id,
      expectedSnapshot: {},
      authorized: true,
    },
  });
  assert.equal(create.status, 403);

  const share = {
    id: "share-stale",
    createdAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2099-01-01T00:00:00.000Z",
    revoked: false,
    purpose: "custom",
    selectedFields: ["identity"],
    sharedBy: "A",
    ownerKey: users["token-a"].id,
    recipientUserId: users["token-b"].id,
    snapshot: { identity: { fullName: "A" } },
  };
  globalThis.__mobileShares.set(share.id, share);
  grant(users["token-b"].id, stale);
  const recipient = await call("GET", `shares/${share.id}`, { token: "token-b" });
  assert.equal(recipient.status, 403);
  const revoke = await call("POST", "shares/share-stale/revoke", { token: "token-a" });
  assert.equal(revoke.status, 200);
  assert.equal((await body(revoke)).revoked, true);
});

test("consent requires exact current versions and records all server-owned events", async () => {
  resetData();
  const stale = await call("POST", "consent", {
    token: "token-c",
    body: {
      termsAccepted: true,
      healthAccepted: true,
      versions: { ...CONSENT_POLICY_VERSIONS, privacy_policy: "old" },
    },
  });
  assert.equal(stale.status, 409);
  const accepted = await call("POST", "consent", {
    token: "token-c",
    body: { termsAccepted: true, healthAccepted: true, versions: CONSENT_POLICY_VERSIONS },
  });
  assert.equal(accepted.status, 200);
  const account = await call("GET", "account", { token: "token-c" });
  assert.deepEqual((await body(account)).consent, {
    healthCurrent: true,
    termsCurrent: true,
    privacyCurrent: true,
  });
});

test("A creates selected fields, B can read, C cannot, and revoke denies B", async () => {
  resetData();
  const preview = await call("POST", "shares/preview", {
    token: "token-a",
    body: { selectedFields: ["identity"] },
  });
  assert.equal(preview.status, 200);
  const snapshot = (await body(preview)).snapshot;
  const created = await call("POST", "shares", {
    token: "token-a",
    body: {
      purpose: "custom",
      selectedFields: ["identity"],
      durationMinutes: 60,
      recipientUserId: users["token-b"].id,
      expectedSnapshot: snapshot,
      authorized: true,
    },
  });
  assert.equal(created.status, 201);
  const createdBody = await body(created);
  assert.deepEqual(Object.keys(createdBody.snapshot), ["identity"]);

  const recipient = await call("GET", `shares/${createdBody.id}`, { token: "token-b" });
  assert.equal(recipient.status, 200);
  assert.deepEqual(Object.keys((await body(recipient)).snapshot), ["identity"]);
  const denied = await call("GET", `shares/${createdBody.id}`, { token: "token-c" });
  assert.equal(denied.status, 404);

  const mismatch = await call("POST", "shares", {
    token: "token-a",
    body: {
      purpose: "custom",
      selectedFields: ["identity"],
      durationMinutes: 60,
      recipientUserId: users["token-b"].id,
      expectedSnapshot: {},
      authorized: true,
    },
  });
  assert.equal(mismatch.status, 409);

  const revoked = await call("POST", `shares/${createdBody.id}/revoke`, { token: "token-a" });
  assert.equal(revoked.status, 200);
  const deniedAfterRevoke = await call("GET", `shares/${createdBody.id}`, { token: "token-b" });
  assert.equal(deniedAfterRevoke.status, 404);
});

test("auth responses are no-store, never set cookies, and never expose the service key", async () => {
  const response = await call("POST", "auth/signin", {
    body: { email: "a@example.test", password: "correct-password" },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("pragma"), "no-cache");
  assert.equal(response.headers.get("set-cookie"), null);
  const text = JSON.stringify(await body(response));
  assert.equal(text.includes("synthetic-service-key"), false);

  const invalid = await call("POST", "auth/signin", {
    body: { email: "a@example.test", password: "wrong" },
  });
  assert.equal(invalid.status, 401);
  assert.equal(invalid.headers.get("set-cookie"), null);
});

test("malformed and primitive JSON bodies are rejected", async () => {
  for (const bodyValue of ["{", null, [], "text"]) {
    const response = await call("POST", "consent", {
      token: "token-a",
      body: typeof bodyValue === "string" && bodyValue === "{" ? bodyValue : bodyValue,
    });
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});
