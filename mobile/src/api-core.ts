import type { MobileSession } from "../../types/mobile";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export interface RefreshStorage {
  get(): Promise<string | null>;
  set(value: string): Promise<void>;
  clear(): Promise<void>;
}

export interface ApiCoreOptions {
  origin: string;
  development?: boolean;
  fetcher?: typeof fetch;
  storage: RefreshStorage;
  now?: () => number;
  timeoutMs?: number;
}

interface MemorySession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export const REFRESH_STORAGE_KEY = "vitalid.native.refresh";

const PROACTIVE_REFRESH_SECONDS = 30;
const MAX_TOKEN_LENGTH = 8192;
const API_PATHS = new Set(["account", "identity", "consent", "shares", "shares/preview"]);
const ID = "[A-Za-z0-9_-]{1,128}";
const SHARE_PATH = new RegExp(`^shares/${ID}(?:/revoke)?$`);

export function validateApiOrigin(raw: string, development = false): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("invalid_api_origin");
  }
  const loopback = parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "::1" ||
    parsed.hostname === "10.0.2.2";
  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== "/" ||
    parsed.port && !/^\d+$/.test(parsed.port)
  ) {
    throw new Error("invalid_api_origin");
  }
  if (parsed.protocol !== "https:" && !(development && parsed.protocol === "http:" && loopback)) {
    throw new Error("invalid_api_origin");
  }
  return parsed.origin;
}

export function validateApiPath(path: string, allowAuth = false): string {
  if (
    typeof path !== "string" ||
    path.length === 0 ||
    path.length > 256 ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes("?") ||
    path.includes("#") ||
    path.includes("//") ||
    path.includes("%") ||
    path.split("/").some((segment) => segment === "." || segment === ".." || segment.length === 0)
  ) {
    throw new ApiError(0, "invalid_path");
  }
  if (allowAuth && (path === "auth/signin" || path === "auth/refresh" || path === "auth/signout")) {
    return path;
  }
  if (!API_PATHS.has(path) && !SHARE_PATH.test(path)) {
    throw new ApiError(0, "invalid_path");
  }
  return path;
}

function sessionFromPayload(payload: unknown): MemorySession {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApiError(502, "invalid_response");
  }
  const value = payload as Partial<MobileSession>;
  if (
    typeof value.accessToken !== "string" ||
    value.accessToken.length === 0 ||
    value.accessToken.length > MAX_TOKEN_LENGTH ||
    typeof value.refreshToken !== "string" ||
    value.refreshToken.length === 0 ||
    value.refreshToken.length > MAX_TOKEN_LENGTH ||
    typeof value.expiresAt !== "number" ||
    !Number.isFinite(value.expiresAt)
  ) {
    throw new ApiError(502, "invalid_response");
  }
  return {
    accessToken: value.accessToken,
    refreshToken: value.refreshToken,
    expiresAt: value.expiresAt,
  };
}

function responseCode(payload: unknown): string {
  if (
    payload !== null &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    typeof (payload as { error?: unknown }).error === "string" &&
    /^[a-z][a-z0-9_-]{0,63}$/.test((payload as { error: string }).error)
  ) {
    return (payload as { error: string }).error;
  }
  return "request_failed";
}

class ApiCore {
  private readonly fetcher: typeof fetch;
  private readonly origin: string;
  private readonly storage: RefreshStorage;
  private readonly now: () => number;
  private readonly timeoutMs: number;
  private session: MemorySession | null = null;
  private generation = 0;
  private refreshFlight: { generation: number; promise: Promise<MemorySession> } | null = null;
  private restoreFlight: { generation: number; promise: booleanPromise } | null = null;
  private storageTail: Promise<void> = Promise.resolve();

  constructor(options: ApiCoreOptions) {
    this.origin = validateApiOrigin(options.origin, options.development ?? false);
    this.fetcher = options.fetcher ?? fetch;
    this.storage = options.storage;
    this.now = options.now ?? (() => Date.now());
    this.timeoutMs = options.timeoutMs ?? 20_000;
  }

  private queueStorage<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.storageTail.then(operation, operation);
    this.storageTail = result.then(() => undefined, () => undefined);
    return result;
  }

  private async clearLocal(generation = this.generation): Promise<void> {
    this.session = null;
    try {
      await this.queueStorage(async () => {
        if (generation === this.generation) await this.storage.clear();
      });
    } catch {
      return;
    }
  }

  private async persistAndInstall(next: MemorySession, generation: number): Promise<MemorySession> {
    if (generation !== this.generation) throw new ApiError(401, "session_changed");
    let written = false;
    try {
      written = await this.queueStorage(async () => {
        if (generation !== this.generation) return false;
        await this.storage.set(next.refreshToken);
        return true;
      });
    } catch {
      await this.clearLocal(generation);
      throw new ApiError(0, "storage_error");
    }
    if (!written || generation !== this.generation) {
      throw new ApiError(401, "session_changed");
    }
    this.session = next;
    return next;
  }

  private async fetchJson(path: string, body: unknown, accessToken?: string, method?: "GET" | "POST"): Promise<{
    status: number;
    payload: unknown;
  }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers = new Headers({ "content-type": "application/json", accept: "application/json" });
      if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
      const response = await this.fetcher(`${this.origin}/api/mobile/v1/${path}`, {
        method: method ?? (body === undefined ? "GET" : "POST"),
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: "omit",
        cache: "no-store",
        signal: controller.signal,
      });
      let payload: unknown = null;
      try { payload = await response.json(); } catch { /* handled as a safe response error below */ }
      return { status: response.status, payload };
    } catch {
      if (controller.signal.aborted) throw new ApiError(0, "timeout");
      throw new ApiError(0, "network_error");
    } finally {
      clearTimeout(timeout);
    }
  }

  private async exchangeRefresh(refreshToken: string, generation: number): Promise<MemorySession> {
    const response = await this.fetchJson("auth/refresh", { refreshToken });
    if (response.status === 401) {
      if (generation === this.generation) await this.clearLocal(generation);
      throw new ApiError(401, "unauthenticated");
    }
    if (response.status >= 500) throw new ApiError(response.status, "unavailable");
    if (response.status < 200 || response.status >= 300) {
      throw new ApiError(response.status, responseCode(response.payload));
    }
    const next = sessionFromPayload(response.payload);
    return this.persistAndInstall(next, generation);
  }

  private refresh(): Promise<MemorySession> {
    const generation = this.generation;
    const existing = this.refreshFlight;
    if (existing?.generation === generation) return existing.promise;
    const refreshToken = this.session?.refreshToken;
    if (!refreshToken) return Promise.reject(new ApiError(401, "unauthenticated"));
    const promise = this.exchangeRefresh(refreshToken, generation);
    this.refreshFlight = { generation, promise };
    void promise.then(
      () => { if (this.refreshFlight?.promise === promise) this.refreshFlight = null; },
      () => { if (this.refreshFlight?.promise === promise) this.refreshFlight = null; },
    );
    return promise;
  }

  private async validSession(): Promise<MemorySession> {
    const session = this.session;
    if (!session) throw new ApiError(401, "unauthenticated");
    if (session.expiresAt - this.now() / 1000 > PROACTIVE_REFRESH_SECONDS) return session;
    return this.refresh();
  }

  private async rawRequest(path: string, body: unknown, accessToken?: string, method?: "GET" | "POST") {
    return this.fetchJson(path, body, accessToken, method);
  }

  async restore(): Promise<boolean> {
    const existing = this.restoreFlight;
    if (existing?.generation === this.generation) return existing.promise;
    const generation = this.generation;
    const promise = (async () => {
      let refreshToken: string | null;
      try {
        refreshToken = await this.storage.get();
      } catch {
        await this.clearLocal(generation);
        throw new ApiError(0, "storage_error");
      }
      if (!refreshToken) return false;
      if (generation !== this.generation) throw new ApiError(401, "session_changed");
      try {
        await this.exchangeRefresh(refreshToken, generation);
        return generation === this.generation;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401 && generation === this.generation) {
          await this.clearLocal(generation);
          return false;
        }
        throw error;
      }
    })();
    this.restoreFlight = { generation, promise };
    void promise.then(
      () => { if (this.restoreFlight?.promise === promise) this.restoreFlight = null; },
      () => { if (this.restoreFlight?.promise === promise) this.restoreFlight = null; },
    );
    return promise;
  }

  async signIn(email: string, password: string): Promise<void> {
    const generation = ++this.generation;
    this.session = null;
    this.refreshFlight = null;
    try {
      await this.queueStorage(async () => {
        if (generation === this.generation) await this.storage.clear();
      });
    } catch {
      throw new ApiError(0, "storage_error");
    }
    const response = await this.rawRequest("auth/signin", { email, password });
    if (generation !== this.generation) throw new ApiError(401, "session_changed");
    if (response.status === 401) throw new ApiError(401, responseCode(response.payload));
    if (response.status >= 500) throw new ApiError(response.status, "unavailable");
    if (response.status < 200 || response.status >= 300) {
      throw new ApiError(response.status, responseCode(response.payload));
    }
    await this.persistAndInstall(sessionFromPayload(response.payload), generation);
  }

  async signOut(): Promise<void> {
    const accessToken = this.session?.accessToken;
    const generation = ++this.generation;
    this.session = null;
    this.refreshFlight = null;
    this.restoreFlight = null;
    let localError: unknown = null;
    try {
      await this.queueStorage(async () => {
        if (generation === this.generation) await this.storage.clear();
      });
    } catch (error) {
      localError = error;
    }
    let remoteError: unknown = null;
    if (accessToken) {
      try {
        const response = await this.rawRequest("auth/signout", undefined, accessToken, "POST");
        if (response.status < 200 || response.status >= 300) {
          remoteError = new ApiError(response.status, responseCode(response.payload));
        }
      } catch (error) {
        remoteError = error;
      }
    }
    if (localError) throw new ApiError(0, "storage_error");
    if (remoteError) throw remoteError;
  }

  async request<T>(path: string, options: { method?: "GET" | "POST"; body?: unknown } = {}): Promise<T> {
    validateApiPath(path);
    const method = options.method ?? "GET";
    const generation = this.generation;
    const session = await this.validSession();
    if (generation !== this.generation) throw new ApiError(401, "session_changed");
    let response = await this.rawRequest(path, method === "POST" ? options.body : undefined, session.accessToken);
    if (response.status === 401) {
      const next = await this.refresh();
      if (generation !== this.generation) throw new ApiError(401, "session_changed");
      response = await this.rawRequest(path, method === "POST" ? options.body : undefined, next.accessToken);
      if (response.status === 401) {
        await this.clearLocal(generation);
        throw new ApiError(401, "unauthenticated");
      }
    }
    if (response.status < 200 || response.status >= 300) {
      throw new ApiError(response.status, responseCode(response.payload));
    }
    return response.payload as T;
  }
}

type booleanPromise = Promise<boolean>;

export function createApiTransport(options: ApiCoreOptions) {
  const client = new ApiCore(options);
  return {
    restore: () => client.restore(),
    signIn: (email: string, password: string) => client.signIn(email, password),
    signOut: () => client.signOut(),
    request: <T>(path: string, requestOptions?: { method?: "GET" | "POST"; body?: unknown }) =>
      client.request<T>(path, requestOptions),
  };
}
