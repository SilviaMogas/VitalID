import { afterEach, describe, expect, it, vi } from "vitest";
import { PlaudClient, getPlaudClient, plaudConfigured, segmentsToText, __resetPlaudForTests } from "./plaud";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) } as Response;
}

function mockFetch(impl: (url: string, init?: RequestInit) => Response) {
  const fn = vi.fn(async (url: unknown, init?: RequestInit) => impl(String(url), init));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  __resetPlaudForTests();
  delete process.env.PLAUD_TOKENS_JSON;
});

describe("PlaudClient", () => {
  const tokens = { access_token: "tok-1", refresh_token: "rt-1" };

  it("listRecordings maps file fields", async () => {
    mockFetch((url) => {
      expect(url).toContain("/open/third-party/files/");
      return jsonResponse({
        file_list: [
          { id: "f1", name: "Morning note", start_at: "2026-09-20T08:00:00Z", duration: 65000 },
          { id: "f2", name: "Walk", created_at: "2026-09-21T10:00:00Z", duration: 120000 },
        ],
      });
    });
    const c = new PlaudClient(tokens);
    const recs = await c.listRecordings(20);
    expect(recs).toHaveLength(2);
    expect(recs[0]).toEqual({ id: "f1", name: "Morning note", startAt: "2026-09-20T08:00:00Z", durationMs: 65000 });
    expect(recs[1].startAt).toBe("2026-09-21T10:00:00Z");
  });

  it("getTranscript reads inline data_content", async () => {
    mockFetch(() =>
      jsonResponse({
        name: "Note",
        start_at: "2026-09-20T08:00:00Z",
        source_list: [
          { data_type: "summary", data_content: "ignored" },
          { data_type: "transaction", data_content: '[{"content":"hello","speaker":"A"},{"text":"world"}]' },
        ],
      })
    );
    const c = new PlaudClient(tokens);
    const res = await c.getTranscript("f1");
    expect(res.text).toBe("A: hello\nworld");
    expect(res.name).toBe("Note");
  });

  it("getTranscript fetches data_link when content is empty", async () => {
    const fetchMock = mockFetch((url) => {
      if (url === "https://files.example/t.txt") {
        return { ok: true, status: 200, text: async () => '[{"content":"via link"}]', json: async () => ({}) } as Response;
      }
      return jsonResponse({ source_list: [{ data_type: "transaction", data_link: "https://files.example/t.txt" }] });
    });
    const c = new PlaudClient(tokens);
    const res = await c.getTranscript("f1");
    expect(res.text).toBe("via link");
    expect(fetchMock).toHaveBeenCalledWith("https://files.example/t.txt");
  });

  it("refreshes when expires_at is past and retries once on 401", async () => {
    const onTokens = vi.fn();
    const fetchMock = mockFetch((url, init) => {
      if (url.includes("access-token/refresh")) {
        expect(String(init?.body)).toBe("refresh_token=rt-old");
        return jsonResponse({ access_token: "new-tok", expires_in: 3600 });
      }
      const auth = (init?.headers as Record<string, string>).Authorization;
      if (url.includes("401-once")) {
        if (auth === "Bearer stale") return jsonResponse({}, false, 401);
        expect(auth).toBe("Bearer new-tok");
        return jsonResponse({ file_list: [] });
      }
      return jsonResponse({});
    });
    const c = new PlaudClient(
      { access_token: "stale", refresh_token: "rt-old", expires_at: Date.now() - 1000 },
      { onTokens }
    );
    await c.listRecordings();
    expect(onTokens).toHaveBeenCalledOnce();
    expect(onTokens.mock.calls[0][0].access_token).toBe("new-tok");
    expect(onTokens.mock.calls[0][0].refresh_token).toBe("rt-old"); // kept when absent in response
    const refreshCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes("refresh"));
    expect(refreshCalls).toHaveLength(1);
  });

  it("keeps old refresh_token when response lacks one", async () => {
    let seen: { access_token?: string; refresh_token?: string } = {};
    mockFetch((url) => {
      if (url.includes("refresh")) return jsonResponse({ access_token: "a2" });
      return jsonResponse({ file_list: [] });
    });
    const c = new PlaudClient(
      { access_token: "a1", refresh_token: "rt-keep", expires_at: Date.now() - 5 },
      { onTokens: (t) => { seen = t; } }
    );
    await c.listRecordings();
    expect(seen.refresh_token).toBe("rt-keep");
  });
});

describe("segmentsToText", () => {
  it("joins content/text with speaker prefix", () => {
    const raw = JSON.stringify([
      { speaker: "Fatima", content: "Slept poorly." },
      { text: "Knee hurts a bit." },
      { content: "" },
      "loose string",
    ]);
    expect(segmentsToText(raw)).toBe("Fatima: Slept poorly.\nKnee hurts a bit.\nloose string");
  });

  it("falls back to raw text when not JSON", () => {
    expect(segmentsToText("plain transcript")).toBe("plain transcript");
  });
});

describe("configuration", () => {
  it("getPlaudClient is null when env missing or invalid", () => {
    delete process.env.PLAUD_TOKENS_JSON;
    expect(plaudConfigured()).toBe(false);
    expect(getPlaudClient()).toBeNull();
    process.env.PLAUD_TOKENS_JSON = "{bad json";
    expect(plaudConfigured()).toBe(false);
    expect(getPlaudClient()).toBeNull();
  });

  it("getPlaudClient returns a client when configured", () => {
    process.env.PLAUD_TOKENS_JSON = JSON.stringify({ access_token: "x" });
    expect(plaudConfigured()).toBe(true);
    expect(getPlaudClient()).not.toBeNull();
    expect(getPlaudClient()).toBe(getPlaudClient());
  });
});
