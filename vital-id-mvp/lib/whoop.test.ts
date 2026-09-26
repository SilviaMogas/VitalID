import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  decryptTokens,
  encryptTokens,
  exchangeCode,
  readTokens,
  redirectUri,
  requestOrigin,
  WhoopClient,
  type WhoopTokens,
} from "./whoop";
import { tilesFromWhoop, formatSignalValue } from "@/data/syntheticSignals";
import type { WhoopSignals } from "./whoop";

const SECRET = "test-secret";

function tokens(over?: Partial<WhoopTokens>): WhoopTokens {
  return { access_token: "at-1", refresh_token: "rt-1", expires_at: Date.now() + 3600_000, ...over };
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) } as Response;
}

function mockFetch(impl: (url: string, init?: RequestInit) => Response) {
  const fn = vi.fn(async (url: unknown, init?: RequestInit) => impl(String(url), init));
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => {
  process.env.WHOOP_CLIENT_ID = "cid";
  process.env.WHOOP_CLIENT_SECRET = "csecret";
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.WHOOP_CLIENT_ID;
  delete process.env.WHOOP_CLIENT_SECRET;
  delete process.env.WHOOP_REDIRECT_URI;
  delete process.env.WHOOP_COOKIE_SECRET;
});

describe("token cookie crypto", () => {
  it("encrypt/decrypt roundtrip", () => {
    const t = tokens();
    const blob = encryptTokens(t, SECRET);
    expect(decryptTokens(blob, SECRET)).toEqual(t);
  });
  it("tampered blob → null", () => {
    const blob = encryptTokens(tokens(), SECRET);
    const bad = blob.slice(0, -4) + "AAAA";
    expect(decryptTokens(bad, SECRET)).toBeNull();
    expect(decryptTokens("not-a-cookie", SECRET)).toBeNull();
  });
  it("readTokens parses cookie header", () => {
    process.env.WHOOP_COOKIE_SECRET = SECRET;
    const t = tokens();
    const blob = encryptTokens(t, SECRET);
    expect(readTokens(`other=1; vitalid_whoop=${blob}`)).toEqual(t);
    expect(readTokens("other=1")).toBeNull();
  });
});

describe("redirectUri", () => {
  it("uses forwarded headers", () => {
    const req = new Request("http://localhost/api/whoop/connect", {
      headers: { "x-forwarded-proto": "https", "x-forwarded-host": "app.vercel.app" },
    });
    expect(requestOrigin(req)).toBe("https://app.vercel.app");
    expect(redirectUri(req)).toBe("https://app.vercel.app/api/whoop/callback");
  });
  it("env override wins", () => {
    process.env.WHOOP_REDIRECT_URI = "https://custom.example/cb";
    const req = new Request("http://localhost/x");
    expect(redirectUri(req)).toBe("https://custom.example/cb");
  });
});

describe("exchangeCode", () => {
  it("posts form body with credentials in body (no Basic auth)", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("https://api.prod.whoop.com/oauth/oauth2/token");
      const body = String(init?.body);
      expect(body).toContain("grant_type=authorization_code");
      expect(body).toContain("code=CODE123");
      expect(body).toContain("client_id=cid");
      expect(body).toContain("client_secret=csecret");
      expect((init?.headers as Record<string, string>).Authorization).toBeUndefined();
      return jsonResponse({ access_token: "at-new", refresh_token: "rt-new", expires_in: 3600 });
    });
    const t = await exchangeCode("CODE123", "https://app/cb", fetchMock as unknown as typeof fetch);
    expect(t.access_token).toBe("at-new");
    expect(t.refresh_token).toBe("rt-new");
  });
});

describe("WhoopClient", () => {
  it("refreshes expired token with rotation and calls onTokens", async () => {
    const onTokens = vi.fn();
    mockFetch((url, init) => {
      if (url.includes("oauth2/token")) {
        expect(String(init?.body)).toContain("grant_type=refresh_token");
        expect(String(init?.body)).toContain("refresh_token=rt-old");
        return jsonResponse({ access_token: "at-new", refresh_token: "rt-new", expires_in: 3600 });
      }
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer at-new");
      return jsonResponse({ records: [] });
    });
    const c = new WhoopClient(tokens({ access_token: "at-old", refresh_token: "rt-old", expires_at: Date.now() - 1000 }), {
      onTokens,
    });
    await c.getSignals();
    expect(onTokens).toHaveBeenCalledOnce();
    expect(onTokens.mock.calls[0][0].refresh_token).toBe("rt-new");
  });

  it("401 → refresh → retry once", async () => {
    let calls = 0;
    mockFetch((url, init) => {
      if (url.includes("oauth2/token")) return jsonResponse({ access_token: "at-2", expires_in: 3600 });
      calls++;
      const auth = (init?.headers as Record<string, string>).Authorization;
      if (auth === "Bearer at-1") return jsonResponse({}, false, 401);
      expect(auth).toBe("Bearer at-2");
      return jsonResponse({ records: [] });
    });
    const c = new WhoopClient(tokens());
    await c.getSignals();
    expect(calls).toBeGreaterThanOrEqual(3); // profile may fail silently; recovery/sleep retried
  });

  it("3 parallel calls all 401ing first → exactly one refresh POST", async () => {
    let refreshPosts = 0;
    let apiCalls = 0;
    mockFetch((url, init) => {
      if (url.includes("oauth2/token")) {
        refreshPosts++;
        return jsonResponse({ access_token: "at-2", refresh_token: "rt-2", expires_in: 3600 });
      }
      apiCalls++;
      const auth = (init?.headers as Record<string, string>).Authorization;
      if (auth === "Bearer at-1") return jsonResponse({}, false, 401);
      expect(auth).toBe("Bearer at-2");
      return jsonResponse({ records: [] });
    });
    await new WhoopClient(tokens()).getSignals();
    expect(apiCalls).toBe(6); // 3 failed + 3 retried
    expect(refreshPosts).toBe(1);
  });

  it("getSignals normalizes: latest SCORED skips PENDING, nap skipped, weeks oldest→newest capped 7", async () => {
    mockFetch((url) => {
      if (url.includes("profile/basic")) return jsonResponse({ first_name: "Fatima" });
      if (url.includes("recovery")) {
        return jsonResponse({
          records: [
            { score_state: "PENDING_SCORE" },
            {
              score_state: "SCORED",
              score: { recovery_score: 74.4, resting_heart_rate: 58.2, hrv_rmssd_milli: 62.1, spo2_percentage: 97.4, skin_temp_celsius: 33.21 },
            },
            { score_state: "SCORED", score: { recovery_score: 50, resting_heart_rate: 60, hrv_rmssd_milli: 40 } },
          ],
        });
      }
      if (url.includes("sleep")) {
        return jsonResponse({
          records: [
            { nap: true, score_state: "SCORED", score: { stage_summary: { total_in_bed_time_milli: 3600000, total_awake_time_milli: 600000, total_light_sleep_time_milli: 1, total_slow_wave_sleep_time_milli: 1, total_rem_sleep_time_milli: 1 } } },
            {
              nap: false,
              score_state: "SCORED",
              score: {
                sleep_performance_percentage: 81.2,
                respiratory_rate: 14.14,
                stage_summary: {
                  total_in_bed_time_milli: 7 * 3600000,
                  total_awake_time_milli: 42 * 60000,
                  total_light_sleep_time_milli: 198 * 60000,
                  total_slow_wave_sleep_time_milli: 84 * 60000,
                  total_rem_sleep_time_milli: 90 * 60000,
                },
              },
            },
            { nap: false, score_state: "SCORED", score: { stage_summary: { total_in_bed_time_milli: 6 * 3600000, total_awake_time_milli: 0, total_light_sleep_time_milli: 0, total_slow_wave_sleep_time_milli: 0, total_rem_sleep_time_milli: 0 } } },
          ],
        });
      }
      return jsonResponse({});
    });
    const c = new WhoopClient(tokens());
    const s = await c.getSignals();
    expect(s.firstName).toBe("Fatima");
    expect(s.recovery).toBe(74);
    expect(s.rhr).toBe(58);
    expect(s.hrv).toBe(62);
    expect(s.sleepMinutes).toBe(378); // 7h - 42m
    expect(s.sleepPerformance).toBe(81);
    expect(s.spo2).toBe(97.4);
    expect(s.respiratoryRate).toBe(14.1);
    expect(s.week.recovery).toEqual([50, 74]); // oldest → newest
    expect(s.week.sleepHours).toEqual([6, 6.3]);
    expect(s.sleepStages).toEqual({ light: 198, deep: 84, rem: 90, awake: 42 });
  });

  it("getSignals yields nulls when nothing scored", async () => {
    mockFetch(() => jsonResponse({ records: [{ score_state: "PENDING_SCORE" }] }));
    const s = await new WhoopClient(tokens()).getSignals();
    expect(s.recovery).toBeNull();
    expect(s.sleepMinutes).toBeNull();
    expect(s.sleepStages).toBeNull();
    expect(s.week.recovery).toEqual([]);
  });
});

describe("tilesFromWhoop", () => {
  const sig: WhoopSignals = {
    source: "whoop",
    firstName: "F",
    fetchedAt: 0,
    recovery: 74,
    rhr: 58,
    hrv: 62,
    sleepMinutes: 372,
    sleepPerformance: 81,
    spo2: 97,
    skinTempC: 33,
    respiratoryRate: 14,
    week: { recovery: [50, 74], rhr: [60, 58], hrv: [40, 62], sleepHours: [6, 6.2] },
    sleepStages: { light: 1, deep: 1, rem: 1, awake: 1 },
  };
  it("formats values in EN and AR", () => {
    const tiles = tilesFromWhoop(sig);
    const byKey = (k: string) => tiles.find((x) => x.key === k)!;
    expect(formatSignalValue(byKey("sleep"), "en")).toBe("6h 12m");
    expect(formatSignalValue(byKey("sleep"), "ar")).toBe("6 س 12 د");
    expect(formatSignalValue(byKey("rhr"), "ar")).toBe("58 نبضة/د");
    expect(formatSignalValue(byKey("hrv"), "en")).toBe("62 ms");
    expect(formatSignalValue(byKey("recovery"), "en")).toBe("74%");
    expect(byKey("sleep").sub?.en).toBe("Performance 81%");
    expect(byKey("recovery").week).toEqual([50, 74]);
  });
});
