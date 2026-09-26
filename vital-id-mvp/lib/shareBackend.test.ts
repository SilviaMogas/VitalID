import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetBackendForTests,
  backendName,
  RedisBackend,
  selectBackend,
  SupabaseBackend,
} from "./shareBackend";
import type { ShareRecord } from "./shareStore";

const DAY_MS = 24 * 60 * 60 * 1000;

function record(): ShareRecord {
  return {
    id: "id-1",
    token: "tok",
    createdAt: Date.now(),
    expiresAt: Date.now() + 60_000,
    revokedAt: null,
    recipientLabel: "Doc",
    fields: { a: "x" },
    views: [123],
  };
}

function mockFetch(impl: (url: string, init?: RequestInit) => unknown) {
  const fn = vi.fn(async (url: unknown, init?: RequestInit) => impl(String(url), init));
  vi.stubGlobal("fetch", fn);
  return fn;
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  __resetBackendForTests();
});

describe("RedisBackend", () => {
  it("put sends SET with PX >= ttl + 24h", async () => {
    const fetchMock = mockFetch(() => jsonResponse({ result: "OK" }));
    const b = new RedisBackend("https://redis.example", "secret");
    const r = record();
    await b.put(r);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const args = JSON.parse(String(init.body)) as unknown[];
    expect(args[0]).toBe("SET");
    expect(args[1]).toBe("vitalid:share:id-1");
    expect(args[3]).toBe("PX");
    expect(Number(args[4])).toBeGreaterThanOrEqual(r.expiresAt - r.createdAt + DAY_MS - 5000);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer secret");
  });

  it("get parses JSON result", async () => {
    const r = record();
    mockFetch(() => jsonResponse({ result: JSON.stringify(r) }));
    const b = new RedisBackend("https://redis.example", "secret");
    expect(await b.get("id-1")).toEqual(r);
  });

  it("get returns null on missing key", async () => {
    mockFetch(() => jsonResponse({ result: null }));
    const b = new RedisBackend("https://redis.example", "secret");
    expect(await b.get("nope")).toBeNull();
  });
});

describe("SupabaseBackend", () => {
  it("put posts with merge-duplicates Prefer header", async () => {
    const fetchMock = mockFetch(() => jsonResponse({}, true, 201));
    const b = new SupabaseBackend("https://sb.example", "svc");
    await b.put(record());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://sb.example/rest/v1/shares");
    const headers = init.headers as Record<string, string>;
    expect(headers.Prefer).toContain("resolution=merge-duplicates");
    expect(headers.apikey).toBe("svc");
    const row = JSON.parse(String(init.body));
    expect(row.created_at).toBeTypeOf("number");
    expect(row.recipient_label).toBe("Doc");
  });

  it("uses a custom table name in the REST URL", async () => {
    const fetchMock = mockFetch(() => jsonResponse({}, true, 201));
    const b = new SupabaseBackend("https://sb.example", "svc", "public", "vitalid_shares");
    await b.put(record());
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://sb.example/rest/v1/vitalid_shares");
  });

  it("sends profile headers when a non-public schema is passed", async () => {
    const fetchMock = mockFetch(() => jsonResponse({}, true, 201));
    const b = new SupabaseBackend("https://sb.example", "svc", "vitalid");
    await b.put(record());
    const headers = (fetchMock.mock.calls[0] as [string, RequestInit])[1].headers as Record<string, string>;
    expect(headers["Accept-Profile"]).toBe("vitalid");
    expect(headers["Content-Profile"]).toBe("vitalid");
  });

  it("omits profile headers when schema is public or omitted", async () => {
    const fetchMock = mockFetch(() => jsonResponse({}, true, 201));
    await new SupabaseBackend("https://sb.example", "svc").put(record());
    await new SupabaseBackend("https://sb.example", "svc", "public").put(record());
    for (const call of fetchMock.mock.calls) {
      const headers = (call as [string, RequestInit])[1].headers as Record<string, string>;
      expect(headers["Accept-Profile"]).toBeUndefined();
      expect(headers["Content-Profile"]).toBeUndefined();
    }
  });

  it("get maps snake_case row to ShareRecord", async () => {
    const r = record();
    mockFetch(() =>
      jsonResponse([
        {
          id: r.id,
          token: r.token,
          created_at: r.createdAt,
          expires_at: r.expiresAt,
          revoked_at: null,
          recipient_label: r.recipientLabel,
          fields: r.fields,
          views: r.views,
        },
      ])
    );
    const b = new SupabaseBackend("https://sb.example", "svc");
    expect(await b.get("id-1")).toEqual(r);
  });

  it("put writes the views column", async () => {
    const fetchMock = mockFetch(() => jsonResponse({}, true, 201));
    const b = new SupabaseBackend("https://sb.example", "svc");
    await b.put(record());
    const row = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body));
    expect(row.views).toEqual([123]);
  });
});

describe("selectBackend", () => {
  it("falls back to file when no env vars", () => {
    expect(backendName()).toBe("file");
    expect(selectBackend()).toBe(selectBackend()); // memoized
  });
});
