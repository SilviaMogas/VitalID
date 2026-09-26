// Server-only PLAUD client. Credentials never reach the browser.
const API_BASE = "https://platform.plaud.ai/developer/api";
const REFRESH_URL = `${API_BASE}/oauth/third-party/access-token/refresh`;

export interface PlaudTokenSet {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

export interface PlaudRecording {
  id: string;
  name: string;
  startAt: string | null;
  durationMs: number;
}

export type PlaudErrorCode = "not_configured" | "auth" | "upstream";

export class PlaudError extends Error {
  constructor(
    public code: PlaudErrorCode,
    message: string
  ) {
    super(message);
    this.name = "PlaudError";
  }
}

interface FileListItem {
  id?: string;
  name?: string;
  created_at?: string | number;
  start_at?: string | number;
  duration?: number;
}

interface SourceBlock {
  data_type?: string;
  data_content?: string;
  data_link?: string;
}

export function segmentsToText(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const segments = Array.isArray(parsed) ? parsed : [parsed];
    const lines: string[] = [];
    for (const seg of segments) {
      if (seg == null) continue;
      if (typeof seg === "string") {
        if (seg.trim()) lines.push(seg.trim());
        continue;
      }
      if (typeof seg === "object") {
        const s = seg as { content?: unknown; text?: unknown; speaker?: unknown };
        const body = typeof s.content === "string" ? s.content : typeof s.text === "string" ? s.text : "";
        const speaker = typeof s.speaker === "string" && s.speaker.trim() ? `${s.speaker.trim()}: ` : "";
        const line = `${speaker}${body}`.trim();
        if (line) lines.push(line);
      }
    }
    return lines.length ? lines.join("\n") : raw;
  } catch {
    return raw;
  }
}

export class PlaudClient {
  private tokens: PlaudTokenSet;
  private fetchImpl: typeof fetch;
  private onTokens?: (t: PlaudTokenSet) => Promise<void> | void;

  constructor(
    tokens: PlaudTokenSet,
    opts?: { fetchImpl?: typeof fetch; onTokens?: (t: PlaudTokenSet) => Promise<void> | void }
  ) {
    this.tokens = tokens;
    this.fetchImpl = opts?.fetchImpl ?? fetch;
    this.onTokens = opts?.onTokens;
  }

  private async refresh(): Promise<void> {
    if (!this.tokens.refresh_token) throw new PlaudError("auth", "token expired and no refresh_token");
    const res = await this.fetchImpl(REFRESH_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `refresh_token=${encodeURIComponent(this.tokens.refresh_token)}`,
    });
    if (!res.ok) throw new PlaudError("auth", `refresh failed (${res.status})`);
    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) throw new PlaudError("auth", "refresh returned no access_token");
    this.tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? this.tokens.refresh_token,
      expires_at: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    };
    await this.onTokens?.(this.tokens);
  }

  private async api(path: string, retried = false): Promise<unknown> {
    if (this.tokens.expires_at && Date.now() > this.tokens.expires_at - 60_000) {
      await this.refresh();
    }
    const res = await this.fetchImpl(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${this.tokens.access_token}`, Accept: "application/json" },
    });
    if (res.status === 401 && !retried) {
      await this.refresh();
      return this.api(path, true);
    }
    if (res.status === 401) throw new PlaudError("auth", "unauthorized after refresh");
    if (!res.ok) throw new PlaudError("upstream", `PLAUD API ${res.status} for ${path}`);
    return res.json();
  }

  async listRecordings(pageSize = 10): Promise<PlaudRecording[]> {
    const data = (await this.api(`/open/third-party/files/?page=1&page_size=${pageSize}`)) as {
      file_list?: FileListItem[];
      files?: FileListItem[];
    } | FileListItem[];
    const items = Array.isArray(data) ? data : data.file_list ?? data.files ?? [];
    return items.map((f) => ({
      id: String(f.id ?? ""),
      name: f.name ?? "Recording",
      startAt: f.start_at != null ? String(f.start_at) : f.created_at != null ? String(f.created_at) : null,
      durationMs: typeof f.duration === "number" ? f.duration : 0,
    }));
  }

  async getTranscript(fileId: string): Promise<{ text: string; name: string; startAt: string | null }> {
    const file = (await this.api(`/open/third-party/files/${encodeURIComponent(fileId)}`)) as {
      name?: string;
      start_at?: string | number;
      created_at?: string | number;
      source_list?: SourceBlock[];
    };
    const block = (file.source_list ?? []).find((b) => b.data_type === "transaction");
    if (!block) throw new PlaudError("upstream", "no transcript block on recording");
    let raw = block.data_content ?? "";
    if (!raw && block.data_link) {
      const res = await this.fetchImpl(block.data_link);
      if (!res.ok) throw new PlaudError("upstream", `transcript fetch ${res.status}`);
      raw = await res.text();
    }
    if (!raw) throw new PlaudError("upstream", "empty transcript");
    return {
      text: segmentsToText(raw),
      name: file.name ?? "Recording",
      startAt: file.start_at != null ? String(file.start_at) : file.created_at != null ? String(file.created_at) : null,
    };
  }
}

function parseTokens(): PlaudTokenSet | null {
  const raw = process.env.PLAUD_TOKENS_JSON;
  if (!raw) return null;
  try {
    const t = JSON.parse(raw) as PlaudTokenSet;
    return t && typeof t.access_token === "string" ? t : null;
  } catch {
    return null;
  }
}

export function plaudConfigured(): boolean {
  return parseTokens() !== null;
}

const g = globalThis as unknown as { __vitalidPlaud?: PlaudClient };

export function getPlaudClient(): PlaudClient | null {
  if (g.__vitalidPlaud) return g.__vitalidPlaud;
  const tokens = parseTokens();
  if (!tokens) return null;
  g.__vitalidPlaud = new PlaudClient(tokens, {
    onTokens: (t) => {
      // Keep rotated tokens in memory for this process; env/secret stores are
      // not updated (a rotated refresh token won't survive a redeploy).
      const store = g.__vitalidPlaud as unknown as { tokens: PlaudTokenSet };
      store.tokens = t;
    },
  });
  return g.__vitalidPlaud;
}

export function __resetPlaudForTests(): void {
  delete g.__vitalidPlaud;
}
