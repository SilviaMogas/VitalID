import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { ShareRecord } from "./shareStore";

export interface ShareBackend {
  get(id: string): Promise<ShareRecord | null>;
  put(record: ShareRecord): Promise<void>; // insert or overwrite
  clear(): Promise<void>;
}

const KEY_PREFIX = "vitalid:share:";
const EXPIRED_GRACE_MS = 24 * 60 * 60 * 1000; // keep expired records readable for a day

// ---------- File backend (local dev) ----------

class FileBackend implements ShareBackend {
  private map: Map<string, ShareRecord>;
  private file: string;

  constructor() {
    const dir = join(process.cwd(), ".data");
    this.file = join(dir, "shares.json");
    this.map = new Map();
    try {
      if (existsSync(this.file)) {
        const rows = JSON.parse(readFileSync(this.file, "utf8")) as ShareRecord[];
        for (const r of rows) this.map.set(r.id, r);
      }
    } catch {
      // corrupted file; start empty
    }
    this.persistDir = dir;
  }

  private persistDir: string;

  private persist(): void {
    try {
      if (!existsSync(this.persistDir)) mkdirSync(this.persistDir, { recursive: true });
      writeFileSync(this.file, JSON.stringify([...this.map.values()], null, 2));
    } catch {
      // best-effort persistence
    }
  }

  async get(id: string): Promise<ShareRecord | null> {
    return this.map.get(id) ?? null;
  }

  async put(record: ShareRecord): Promise<void> {
    this.map.set(record.id, record);
    this.persist();
  }

  async clear(): Promise<void> {
    this.map.clear();
    this.persist();
  }
}

// ---------- Upstash Redis backend (REST) ----------

export class RedisBackend implements ShareBackend {
  constructor(
    private url: string,
    private token: string
  ) {}

  private async cmd(args: (string | number)[]): Promise<unknown> {
    const res = await fetch(this.url.replace(/\/$/, ""), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(args),
    });
    if (!res.ok) throw new Error(`Redis REST error ${res.status}`);
    const data = (await res.json()) as { result?: unknown; error?: string };
    if (data.error) throw new Error(`Redis REST error: ${data.error}`);
    return data.result;
  }

  async get(id: string): Promise<ShareRecord | null> {
    const result = (await this.cmd(["GET", `${KEY_PREFIX}${id}`])) as string | null;
    if (!result) return null;
    return JSON.parse(result) as ShareRecord;
  }

  async put(record: ShareRecord): Promise<void> {
    const px = Math.max(record.expiresAt - Date.now(), 0) + EXPIRED_GRACE_MS;
    await this.cmd(["SET", `${KEY_PREFIX}${record.id}`, JSON.stringify(record), "PX", px]);
  }

  async clear(): Promise<void> {
    let cursor = "0";
    do {
      const result = (await this.cmd(["SCAN", cursor, "MATCH", `${KEY_PREFIX}*`, "COUNT", 100])) as [
        string,
        string[],
      ];
      cursor = result[0];
      const keys = result[1];
      if (keys.length > 0) await this.cmd(["DEL", ...keys]);
    } while (cursor !== "0");
  }
}

// ---------- Supabase backend (PostgREST) ----------

interface ShareRow {
  id: string;
  token: string;
  created_at: number;
  expires_at: number;
  revoked_at: number | null;
  recipient_label: string;
  fields: Record<string, string | number>;
  views?: number[];
}

function rowToRecord(r: ShareRow): ShareRecord {
  return {
    id: r.id,
    token: r.token,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    revokedAt: r.revoked_at,
    recipientLabel: r.recipient_label,
    fields: r.fields,
    views: r.views ?? [],
  };
}

export class SupabaseBackend implements ShareBackend {
  constructor(
    private url: string,
    private serviceKey: string,
    private schema = "public",
    private table = "shares"
  ) {}

  private headers(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      apikey: this.serviceKey,
      Authorization: `Bearer ${this.serviceKey}`,
      "content-type": "application/json",
      ...extra,
    };
    if (this.schema !== "public") {
      headers["Accept-Profile"] = this.schema;
      headers["Content-Profile"] = this.schema;
    }
    return headers;
  }

  private endpoint(path: string): string {
    return `${this.url.replace(/\/$/, "")}/rest/v1/${this.table}${path}`;
  }

  async get(id: string): Promise<ShareRecord | null> {
    const res = await fetch(this.endpoint(`?id=eq.${encodeURIComponent(id)}&select=*`), {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`Supabase REST error ${res.status}`);
    const rows = (await res.json()) as ShareRow[];
    return rows[0] ? rowToRecord(rows[0]) : null;
  }

  async put(record: ShareRecord): Promise<void> {
    const row: ShareRow = {
      id: record.id,
      token: record.token,
      created_at: record.createdAt,
      expires_at: record.expiresAt,
      revoked_at: record.revokedAt,
      recipient_label: record.recipientLabel,
      fields: record.fields,
      views: record.views ?? [],
    };
    const res = await fetch(this.endpoint(""), {
      method: "POST",
      headers: this.headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error(`Supabase REST error ${res.status}`);
  }

  async clear(): Promise<void> {
    const res = await fetch(this.endpoint("?id=not.is.null"), {
      method: "DELETE",
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`Supabase REST error ${res.status}`);
  }
}

// ---------- Selection ----------

export type BackendName = "redis" | "supabase" | "file";

const g = globalThis as unknown as {
  __vitalidBackend?: ShareBackend;
  __vitalidBackendName?: BackendName;
};

export function selectBackend(): ShareBackend {
  if (g.__vitalidBackend) return g.__vitalidBackend;

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (redisUrl && redisToken) {
    g.__vitalidBackend = new RedisBackend(redisUrl, redisToken);
    g.__vitalidBackendName = "redis";
  } else if (supabaseUrl && supabaseKey) {
    g.__vitalidBackend = new SupabaseBackend(
      supabaseUrl,
      supabaseKey,
      process.env.SUPABASE_SCHEMA ?? "public",
      process.env.SUPABASE_SHARES_TABLE ?? "shares"
    );
    g.__vitalidBackendName = "supabase";
  } else {
    g.__vitalidBackend = new FileBackend();
    g.__vitalidBackendName = "file";
    if (process.env.VERCEL) {
      console.warn(
        "[vitalid] No share-store backend configured (UPSTASH_REDIS_REST_*/KV_REST_API_* or SUPABASE_*). Shares will not survive across serverless instances."
      );
    }
  }
  return g.__vitalidBackend;
}

export function backendName(): BackendName {
  selectBackend();
  return g.__vitalidBackendName!;
}

export function __resetBackendForTests(): void {
  delete g.__vitalidBackend;
  delete g.__vitalidBackendName;
}
