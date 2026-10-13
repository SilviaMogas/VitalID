import assert from "node:assert/strict";
import test from "node:test";

const { GET, POST } = await import("@/app/api/community/route");
const { COMMUNITY_GROUP_CATALOG } = await import("@/lib/community/catalog");

const USER_A = {
  id: "00000000-0000-4000-8000-00000000000a",
  email: "member-a@example.test",
};
const USER_B = {
  id: "00000000-0000-4000-8000-00000000000b",
  email: "member-b@example.test",
};
const POST_ID = "00000000-0000-4000-8000-0000000000c1";
const COMMENT_ID = "00000000-0000-4000-8000-0000000000c2";
const BEFORE_ID = "00000000-0000-4000-8000-0000000000c3";
const LOOPBACK_ORIGIN = "http://127.0.0.1:3002";
const REQUEST_URL = "http://localhost:3002/api/community";

function setup({
  user = USER_A,
  result = { ok: true },
  error = null,
  thrown = null,
} = {}) {
  const calls = [];
  globalThis.__testUser = user;
  globalThis.__communityRpc = async (name, args) => {
    calls.push([name, args]);
    if (thrown) throw thrown;
    return { data: result, error };
  };
  return calls;
}

function requestHeaders({
  origin = LOOPBACK_ORIGIN,
  host = "127.0.0.1:3002",
  fetchSite = "same-origin",
  contentType = false,
  extra = {},
} = {}) {
  const headers = new Headers({
    host,
    "sec-fetch-site": fetchSite,
    ...extra,
  });
  if (origin !== null) headers.set("origin", origin);
  if (contentType) headers.set("content-type", "application/json");
  return headers;
}

function getRequest(query = "", options = {}) {
  return new Request(`${REQUEST_URL}${query}`, {
    headers: requestHeaders(options),
  });
}

function postRequest(value, { raw = false, ...options } = {}) {
  return new Request(REQUEST_URL, {
    method: "POST",
    headers: requestHeaders({ ...options, contentType: true }),
    body: raw ? value : JSON.stringify(value),
  });
}

function expectedRpc(action, {
  userId = USER_A.id,
  groupId = null,
  entityId = null,
  body = null,
  alias = null,
  before = null,
  beforeId = null,
} = {}) {
  return [
    "vital_id_community",
    {
      p_user_id: userId,
      p_action: action,
      p_group_id: groupId,
      p_entity_id: entityId,
      p_body: body,
      p_alias: alias,
      p_before: before,
      p_before_id: beforeId,
    },
  ];
}

async function responseBody(response, expectedStatus) {
  assert.equal(response.status, expectedStatus);
  assert.equal(response.headers.get("cache-control"), "no-store");
  return response.json();
}

test("catalog contains only general, the twelve hobbies and twelve cities", () => {
  assert.equal(COMMUNITY_GROUP_CATALOG.length, 25);
  assert.equal(COMMUNITY_GROUP_CATALOG.filter((group) => group.kind === "hobby").length, 12);
  assert.equal(COMMUNITY_GROUP_CATALOG.filter((group) => group.kind === "city").length, 12);
  assert.ok(COMMUNITY_GROUP_CATALOG.some((group) => group.id === "general"));
  assert.ok(COMMUNITY_GROUP_CATALOG.every((group) => !("members" in group)));
  assert.ok(COMMUNITY_GROUP_CATALOG.every((group) => !group.id.startsWith("goal:")));
});

test("anonymous GET and POST return 401 without calling the RPC", async () => {
  const calls = setup({ user: null });
  assert.deepEqual(await responseBody(await GET(getRequest()), 401), {
    error: "unauthenticated",
    status: 401,
  });
  assert.deepEqual(await responseBody(await POST(postRequest({
    action: "join",
    groupId: "general",
    alias: "Ari",
    acceptedRules: true,
  })), 401), {
    error: "unauthenticated",
    status: 401,
  });
  assert.equal(calls.length, 0);
});

test("loopback same-origin POST is accepted and foreign or cross-site requests are rejected before RPC", async () => {
  const calls = setup();
  const payload = {
    action: "join",
    groupId: "general",
    alias: "Ari",
    acceptedRules: true,
  };
  assert.deepEqual(await responseBody(await POST(postRequest(payload)), 200), {
    ok: true,
  });
  assert.deepEqual(calls, [expectedRpc("join", { groupId: "general", alias: "Ari" })]);

  calls.length = 0;
  assert.deepEqual(await responseBody(await POST(postRequest(payload, {
    origin: "https://attacker.example",
  })), 403), {
    error: "unavailable",
    status: 403,
  });
  assert.equal(calls.length, 0);

  assert.deepEqual(await responseBody(await POST(postRequest(payload, {
    fetchSite: "cross-site",
  })), 403), {
    error: "unavailable",
    status: 403,
  });
  assert.equal(calls.length, 0);
});

test("POST rejects malformed JSON and streamed bodies above 8 KiB", async () => {
  const calls = setup();
  assert.deepEqual(await responseBody(await POST(postRequest("{", { raw: true })), 400), {
    error: "invalid_request",
    status: 400,
  });

  const bytes = new TextEncoder().encode("x".repeat(8 * 1024 + 1));
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  const oversized = new Request(REQUEST_URL, {
    method: "POST",
    headers: requestHeaders({ contentType: true }),
    body,
    duplex: "half",
  });
  assert.deepEqual(await responseBody(await POST(oversized), 413), {
    error: "invalid_request",
    status: 413,
  });
  assert.equal(calls.length, 0);
});

test("join requires explicit rules acceptance and a trimmed alias of 2 to 40 characters", async () => {
  const calls = setup();
  for (const body of [
    { action: "join", groupId: "general", alias: "Ari", acceptedRules: false },
    { action: "join", groupId: "general", alias: "x", acceptedRules: true },
    { action: "join", groupId: "general", alias: "a".repeat(41), acceptedRules: true },
  ]) {
    assert.deepEqual(await responseBody(await POST(postRequest(body)), 400), {
      error: "invalid_request",
      status: 400,
    });
  }
  assert.equal(calls.length, 0);
});

test("POST validates the fixed group catalogue, action and required entity UUIDs", async () => {
  const calls = setup();
  for (const body of [
    { action: "leave", groupId: "goal:fitness" },
    { action: "comment", groupId: "general", entityId: "not-a-uuid", body: "Hi" },
    { action: "delete_post", groupId: "general", entityId: "not-a-uuid" },
    { action: "groups", groupId: "general" },
  ]) {
    assert.deepEqual(await responseBody(await POST(postRequest(body)), 400), {
      error: "invalid_request",
      status: 400,
    });
  }
  assert.equal(calls.length, 0);
});

test("valid POST operations send exact RPC arguments and ignore a spoofed userId", async () => {
  const operations = [
    {
      payload: { action: "join", groupId: "general", alias: "  Ari  ", acceptedRules: true },
      expected: expectedRpc("join", { groupId: "general", alias: "Ari" }),
    },
    {
      payload: { action: "leave", groupId: "hobby:fitness" },
      expected: expectedRpc("leave", { groupId: "hobby:fitness" }),
    },
    {
      payload: { action: "post", groupId: "city:dubai", body: "  Hello community  ", userId: USER_B.id },
      expected: expectedRpc("post", { groupId: "city:dubai", body: "Hello community" }),
    },
    {
      payload: { action: "comment", groupId: "general", entityId: POST_ID, body: "  Thanks  " },
      expected: expectedRpc("comment", { groupId: "general", entityId: POST_ID, body: "Thanks" }),
    },
    {
      payload: { action: "delete_post", groupId: "general", entityId: POST_ID },
      expected: expectedRpc("delete_post", { groupId: "general", entityId: POST_ID }),
    },
    {
      payload: { action: "delete_comment", groupId: "general", entityId: COMMENT_ID },
      expected: expectedRpc("delete_comment", { groupId: "general", entityId: COMMENT_ID }),
    },
    {
      payload: { action: "report_post", groupId: "general", entityId: POST_ID, body: "privacy" },
      expected: expectedRpc("report_post", { groupId: "general", entityId: POST_ID, body: "privacy" }),
    },
    {
      payload: { action: "report_comment", groupId: "general", entityId: COMMENT_ID, body: "spam" },
      expected: expectedRpc("report_comment", { groupId: "general", entityId: COMMENT_ID, body: "spam" }),
    },
  ];

  for (const operation of operations) {
    const calls = setup();
    assert.deepEqual(await responseBody(await POST(postRequest(operation.payload)), 200), {
      ok: true,
    });
    assert.deepEqual(calls, [operation.expected], operation.payload.action);
  }
});

test("GET defaults to groups and rejects write actions or unknown groups", async () => {
  const calls = setup({ result: { groups: [] } });
  assert.deepEqual(await responseBody(await GET(getRequest()), 200), { groups: [] });
  assert.deepEqual(calls, [expectedRpc("groups")]);

  calls.length = 0;
  assert.deepEqual(await responseBody(await GET(getRequest("?view=join")), 400), {
    error: "invalid_request",
    status: 400,
  });
  assert.deepEqual(await responseBody(await GET(getRequest("?view=feed&group=goal%3Afitness")), 400), {
    error: "invalid_request",
    status: 400,
  });
  assert.equal(calls.length, 0);
});

test("feed and comments accept paired validated cursors and use their view as the RPC action", async () => {
  const calls = setup({ result: { posts: [] } });
  const before = "2026-10-12T12:00:00.000Z";
  const feedQuery = `?view=feed&group=general&before=${encodeURIComponent(before)}&beforeId=${BEFORE_ID}`;
  assert.deepEqual(await responseBody(await GET(getRequest(feedQuery)), 200), { posts: [] });
  assert.deepEqual(calls[0], expectedRpc("feed", {
    groupId: "general",
    before,
    beforeId: BEFORE_ID,
  }));

  const commentCalls = setup({ result: { comments: [] } });
  const commentsQuery = `?view=comments&group=city%3Adubai&post=${POST_ID}&before=${encodeURIComponent(before)}&beforeId=${BEFORE_ID}`;
  assert.deepEqual(await responseBody(await GET(getRequest(commentsQuery)), 200), { comments: [] });
  assert.deepEqual(commentCalls[0], expectedRpc("comments", {
    groupId: "city:dubai",
    entityId: POST_ID,
    before,
    beforeId: BEFORE_ID,
  }));
});

test("GET rejects incomplete or invalid cursors and malformed comment identifiers", async () => {
  const calls = setup();
  for (const query of [
    "?view=feed&group=general&before=2026-10-12T12%3A00%3A00.000Z",
    "?view=feed&group=general&before=tomorrow&beforeId=" + BEFORE_ID,
    "?view=comments&group=general&post=not-a-uuid",
  ]) {
    assert.deepEqual(await responseBody(await GET(getRequest(query)), 400), {
      error: "invalid_request",
      status: 400,
    });
  }
  assert.equal(calls.length, 0);
});

test("RPC rate limits are forwarded while store errors return a generic no-store 503", async () => {
  const rateLimited = setup({ result: { error: "rate_limited", status: 429 } });
  assert.deepEqual(await responseBody(await POST(postRequest({
    action: "join",
    groupId: "general",
    alias: "Ari",
    acceptedRules: true,
  })), 429), {
    error: "rate_limited",
    status: 429,
  });
  assert.equal(rateLimited.length, 1);

  const failed = setup({ error: { message: "private SQL details and credentials" } });
  const failure = await responseBody(await POST(postRequest({
    action: "leave",
    groupId: "general",
  })), 503);
  assert.deepEqual(failure, { error: "unavailable", status: 503 });
  assert.doesNotMatch(JSON.stringify(failure), /SQL|credentials|private/i);
  assert.equal(failed.length, 1);

  const thrown = setup({ thrown: new Error("sensitive database stack") });
  assert.deepEqual(await responseBody(await POST(postRequest({
    action: "leave",
    groupId: "general",
  })), 503), {
    error: "unavailable",
    status: 503,
  });
  assert.equal(thrown.length, 1);
});
