import assert from "node:assert/strict";
import test from "node:test";

const { GET, POST } = await import("@/app/api/wellness/route");
const { CONSENT_POLICY_VERSIONS } = await import("@/lib/legal");

const USER = { id: "00000000-0000-4000-8000-0000000000a1", email: "a@example.test" };
const OTHER = { id: "00000000-0000-4000-8000-0000000000b1", email: "b@example.test" };
const ID = "00000000-0000-4000-8000-0000000000c1";
const UPDATED = "2026-10-12T12:34:56.123456Z";
const URL = "http://localhost:3002/api/wellness";

function setup({
  user = USER,
  consent = true,
  consentVersion = CONSENT_POLICY_VERSIONS.health_data,
  result = { ok: true },
  error = null,
  thrown = null,
} = {}) {
  const calls = [];
  globalThis.__testUser = user;
  globalThis.__wellnessConsent = consent;
  globalThis.__wellnessConsentVersion = consentVersion;
  globalThis.__wellnessConsentError = false;
  globalThis.__wellnessRpc = async (name, args) => {
    calls.push([name, args]);
    if (thrown) throw thrown;
    return { data: result, error };
  };
  return calls;
}

function headers({ origin = "http://127.0.0.1:3002", fetchSite = "same-origin" } = {}) {
  return new Headers({
    host: "127.0.0.1:3002",
    origin,
    "sec-fetch-site": fetchSite,
    "content-type": "application/json",
  });
}

function post(body, options = {}) {
  return new Request(URL, {
    method: "POST",
    headers: headers(options),
    body: options.raw ? body : JSON.stringify(body),
  });
}

function get(query = "", options = {}) {
  return new Request(`${URL}${query}`, { headers: headers(options) });
}

async function body(response, status) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get("cache-control"), "no-store");
  return response.json();
}

function expected(action, kind, extra = {}) {
  return ["vital_id_wellness", {
    p_user_id: USER.id,
    p_action: action,
    p_kind: kind,
    p_id: null,
    p_data: null,
    p_updated_at: null,
    ...extra,
  }];
}

function metadataExpected(kind) {
  return ["vital_id_wellness_deletion_metadata", {
    p_user_id: USER.id,
    p_kind: kind,
  }];
}

const workout = {
  title: "  Strength  ",
  exercises: [{ name: " Squat ", sets: 3, reps: "8-10", note: " controlled " }],
  notes: "  Baseline  ",
  userId: OTHER.id,
  email: OTHER.email,
};
const rebuiltWorkout = {
  title: "Strength",
  exercises: [{ name: "Squat", sets: 3, reps: "8-10", note: "controlled" }],
  notes: "Baseline",
};

test("auth, origin and consent gates are no-store; delete remains available without consent", async () => {
  const calls = setup({ user: null });
  assert.deepEqual(await body(await GET(get("?kind=workout")), 401), { error: "unauthenticated" });
  assert.deepEqual(await body(await POST(post({ action: "create", kind: "workout", data: workout })), 401), { error: "unauthenticated" });
  assert.equal(calls.length, 0);
  const originCalls = setup();
  assert.deepEqual(await body(await POST(post({ action: "create", kind: "workout", data: workout }, { origin: "https://evil.test" })), 403), { error: "unavailable" });
  assert.deepEqual(await body(await POST(post({ action: "create", kind: "workout", data: workout }, { fetchSite: "cross-site" })), 403), { error: "unavailable" });
  assert.equal(originCalls.length, 0);
  const noConsent = setup({ consent: false });
  assert.deepEqual(await body(await GET(get("?kind=workout")), 403), { error: "consent_required" });
  assert.deepEqual(await body(await POST(post({ action: "create", kind: "workout", data: workout })), 403), { error: "consent_required" });
  assert.deepEqual(await body(await POST(post({ action: "delete", kind: "workout", id: ID, updatedAt: UPDATED })), 200), { ok: true });
  assert.deepEqual(noConsent[0], expected("delete", "workout", { p_id: ID, p_updated_at: UPDATED }));
});

test("stale health-data consent blocks GET/create/update but not delete", async () => {
  const calls = setup({ consentVersion: "2026-10-07" });
  assert.equal(globalThis.__wellnessConsent, true);
  assert.notEqual(globalThis.__wellnessConsentVersion, CONSENT_POLICY_VERSIONS.health_data);
  assert.deepEqual(await body(await GET(get("?kind=workout")), 403), { error: "consent_required" });
  assert.deepEqual(await body(await POST(post({ action: "create", kind: "workout", data: workout })), 403), { error: "consent_required" });
  assert.deepEqual(await body(await POST(post({
    action: "update", kind: "workout", id: ID, updatedAt: UPDATED, data: rebuiltWorkout,
  })), 403), { error: "consent_required" });
  assert.equal(calls.length, 0);
  assert.deepEqual(await body(await POST(post({
    action: "delete", kind: "workout", id: ID, updatedAt: UPDATED,
  })), 200), { ok: true });
  assert.deepEqual(calls, [expected("delete", "workout", { p_id: ID, p_updated_at: UPDATED })]);
});

test("deletion metadata is available without current consent and never includes payload data", async () => {
  const unauthenticated = setup({ user: null, consent: false });
  assert.deepEqual(
    await body(await GET(get("?kind=workout&view=deletion")), 401),
    { error: "unauthenticated" },
  );
  assert.equal(unauthenticated.length, 0);

  const crossOrigin = setup({ consent: false });
  assert.deepEqual(
    await body(await GET(get("?kind=workout&view=deletion", { origin: "https://evil.test" })), 403),
    { error: "unavailable" },
  );
  assert.deepEqual(
    await body(await GET(get("?kind=workout&view=deletion", { fetchSite: "cross-site" })), 403),
    { error: "unavailable" },
  );
  assert.equal(crossOrigin.length, 0);

  for (const kind of ["workout", "supplement"]) {
    const calls = setup({
      consent: false,
      result: {
        entries: [{
          id: ID,
          kind,
          createdAt: "2026-10-12T10:20:30.123456Z",
          updatedAt: UPDATED,
          data: { title: "private value" },
          user_id: OTHER.id,
        }],
      },
    });
    assert.deepEqual(
      await body(await GET(get(`?kind=${kind}&view=deletion&userId=${OTHER.id}`)), 200),
      {
        entries: [{
          id: ID,
          kind,
          createdAt: "2026-10-12T10:20:30.123456Z",
          updatedAt: UPDATED,
        }],
      },
    );
    assert.deepEqual(calls, [metadataExpected(kind)]);
  }

  const stale = setup({ consentVersion: "2026-10-07", result: { entries: [] } });
  assert.deepEqual(await body(await GET(get("?kind=workout&view=deletion")), 200), { entries: [] });
  assert.deepEqual(stale, [metadataExpected("workout")]);
});

test("deletion metadata validates query multiplicity, rows and RPC failures", async () => {
  const invalidQueries = [
    "?kind=workout&kind=supplement",
    "?kind=workout&view=deletion&view=deletion",
    "?kind=workout&view=full",
    "?kind=workout&view=",
  ];
  for (const query of invalidQueries) {
    const calls = setup({ consent: false });
    assert.deepEqual(await body(await GET(get(query)), 400), { error: "invalid_request" });
    assert.equal(calls.length, 0);
  }

  const postCalls = setup({ consent: false });
  assert.deepEqual(await body(await POST(post({
    action: "list_deletion",
    kind: "workout",
  })), 400), { error: "invalid_request" });
  assert.equal(postCalls.length, 0);

  for (const result of [
    { entries: [{ id: ID, kind: "supplement", createdAt: UPDATED, updatedAt: UPDATED }] },
    { entries: [{ id: ID, kind: "workout", createdAt: "not-a-timestamp", updatedAt: UPDATED }] },
    { entries: Array.from({ length: 101 }, () => ({ id: ID, kind: "workout", createdAt: UPDATED, updatedAt: UPDATED })) },
    { entries: "not-an-array" },
  ]) {
    setup({ consent: false, result });
    assert.deepEqual(await body(await GET(get("?kind=workout&view=deletion")), 503), { error: "unavailable" });
  }

  setup({ consent: false, result: { error: "internal", status: 500 } });
  assert.deepEqual(await body(await GET(get("?kind=workout&view=deletion")), 503), { error: "unavailable" });
});

test("create, list, update and delete use exact RPC arguments and preserve microseconds", async () => {
  const calls = setup();
  assert.deepEqual(await body(await POST(post({ action: "create", kind: "workout", data: workout })), 200), { ok: true });
  assert.deepEqual(calls[0], expected("create", "workout", { p_data: rebuiltWorkout }));
  calls.length = 0;
  assert.deepEqual(await body(await GET(get("?kind=supplement")), 200), { ok: true });
  assert.deepEqual(calls[0], expected("list", "supplement"));
  calls.length = 0;
  assert.deepEqual(await body(await POST(post({
    action: "update", kind: "supplement", id: ID, updatedAt: UPDATED,
    data: { name: " Magnesium ", amount: "200 mg", schedule: "night", note: "" },
  })), 200), { ok: true });
  assert.deepEqual(calls[0], expected("update", "supplement", {
    p_id: ID,
    p_data: { name: "Magnesium", amount: "200 mg", schedule: "night", note: "" },
    p_updated_at: UPDATED,
  }));
  calls.length = 0;
  assert.deepEqual(await body(await POST(post({
    action: "delete", kind: "supplement", id: ID, updatedAt: UPDATED, userId: OTHER.id,
  })), 200), { ok: true });
  assert.deepEqual(calls[0], expected("delete", "supplement", { p_id: ID, p_updated_at: UPDATED }));
});

test("strict schema validation rejects bad values and bounds while malformed and oversized bodies fail safely", async () => {
  const calls = setup();
  for (const data of [
    { title: "x", exercises: [], notes: "" },
    { title: "x", exercises: [{ name: "x", sets: "3", reps: "", note: "" }], notes: "" },
    { title: "x", exercises: [{ name: "x", sets: 1, reps: "", note: "x".repeat(201) }], notes: "" },
    { title: "x".repeat(81), exercises: [{ name: "x", sets: 1 }], notes: "" },
    { title: "x", exercises: Array.from({ length: 21 }, () => ({ name: "x", sets: 1 })), notes: "" },
    ...[0, 21, 1.5].map((sets) => ({ title: "x", exercises: [{ name: "x", sets }], notes: "" })),
    { title: "x", exercises: [{ name: "x", sets: 1, reps: "x".repeat(41) }], notes: "" },
    { name: "Vitamin", amount: 5, schedule: "", note: "" },
    { name: "x".repeat(81), amount: "", schedule: "", note: "" },
    { name: "x", amount: "", schedule: "x".repeat(121), note: "" },
    { name: "x", amount: "", schedule: "", note: "x".repeat(501) },
  ]) {
    const kind = data.name ? "supplement" : "workout";
    assert.deepEqual(await body(await POST(post({ action: "create", kind, data })), 400), { error: "invalid_request" });
  }
  assert.deepEqual(await body(await POST(post("{", { raw: true })), 400), { error: "invalid_request" });
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("x".repeat(32 * 1024 + 1)));
      controller.close();
    },
  });
  const oversized = new Request(URL, { method: "POST", headers: headers(), body: stream, duplex: "half" });
  assert.deepEqual(await body(await POST(oversized), 413), { error: "invalid_request" });
  const declaredOversizedHeaders = headers();
  declaredOversizedHeaders.set("content-length", String(32 * 1024 + 1));
  const declaredOversized = new Request(URL, {
    method: "POST",
    headers: declaredOversizedHeaders,
    body: "{}",
  });
  assert.deepEqual(await body(await POST(declaredOversized), 413), { error: "invalid_request" });
  assert.equal(calls.length, 0);
});

test("80 Unicode code points are accepted and omitted optional strings normalize to empty", async () => {
  const calls = setup();
  const title = "💪".repeat(80);
  assert.deepEqual(await body(await POST(post({
    action: "create",
    kind: "workout",
    data: { title, exercises: [{ name: "🏋️", sets: 1 }] },
  })), 200), { ok: true });
  assert.deepEqual(calls, [expected("create", "workout", {
    p_data: {
      title,
      exercises: [{ name: "🏋️", sets: 1, reps: "", note: "" }],
      notes: "",
    },
  })]);
  assert.equal(calls[0][1].p_user_id, USER.id);
});

test("invalid identifiers/actions, consent failures and SQL errors are mapped without leaking details", async () => {
  const calls = setup();
  for (const payload of [
    { action: "list", kind: "workout" },
    { action: "delete", kind: "workout", id: "not-uuid", updatedAt: UPDATED },
    { action: "update", kind: "workout", id: ID, updatedAt: "2026-10-12" },
    { action: "create", kind: "other", data: workout },
  ]) {
    assert.deepEqual(await body(await POST(post(payload)), 400), { error: "invalid_request" });
  }
  assert.equal(calls.length, 0);
  const conflict = setup({ result: { error: "conflict", status: 409 } });
  assert.deepEqual(await body(await POST(post({ action: "update", kind: "workout", id: ID, updatedAt: UPDATED, data: rebuiltWorkout })), 409), {
    error: "conflict", status: 409,
  });
  assert.equal(conflict.length, 1);
  setup({ result: { error: "rate_limited", status: 429 } });
  assert.deepEqual(await body(await POST(post({ action: "create", kind: "workout", data: rebuiltWorkout })), 429), {
    error: "rate_limited", status: 429,
  });
  setup({ result: { error: "internal", status: 500 } });
  assert.deepEqual(await body(await GET(get("?kind=workout")), 503), { error: "unavailable" });
  setup({ error: { message: "private SQL error detail" } });
  assert.deepEqual(await body(await POST(post({ action: "create", kind: "workout", data: workout })), 503), { error: "unavailable" });
  setup({ thrown: new Error("private RPC exception detail") });
  assert.deepEqual(await body(await POST(post({ action: "create", kind: "workout", data: workout })), 503), { error: "unavailable" });
  globalThis.__wellnessConsentError = true;
  assert.deepEqual(await body(await GET(get("?kind=workout")), 503), { error: "unavailable" });
});
