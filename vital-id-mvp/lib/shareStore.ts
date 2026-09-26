import { randomBytes, randomUUID } from "crypto";
import { selectBackend } from "./shareBackend";

export interface ShareRecord {
  id: string;
  token: string;
  createdAt: number;
  expiresAt: number;
  revokedAt: number | null;
  recipientLabel: string;
  fields: Record<string, string | number>;
  views: number[];
}

export type ShareStatus = "active" | "expired" | "revoked" | "not_found";

const MIN_TTL_MINUTES = 0.01;
const MAX_TTL_MINUTES = 7 * 24 * 60;

export async function createShare(input: {
  fields: Record<string, string | number>;
  recipientLabel: string;
  ttlMinutes: number;
  expiresAt?: number;
  managed?: boolean;
}): Promise<ShareRecord> {
  const ttl = Math.min(Math.max(input.ttlMinutes, MIN_TTL_MINUTES), MAX_TTL_MINUTES);
  const now = Date.now();
  const record: ShareRecord = {
    id: randomUUID(),
    token: randomBytes(32).toString("hex"),
    createdAt: now,
    expiresAt: input.expiresAt ?? now + ttl * 60_000,
    revokedAt: null,
    recipientLabel: input.recipientLabel,
    fields: input.managed ? { ...input.fields, "pack:owner": randomBytes(32).toString("hex") } : input.fields,
    views: [],
  };
  await selectBackend().put(record);
  return record;
}

export async function getShare(
  id: string,
  token: string | null,
  opts?: { countView?: boolean }
): Promise<{ status: ShareStatus; record?: ShareRecord }> {
  const record = await selectBackend().get(id);
  if (!record || !token || (token !== record.token && !(opts?.countView === false && token === record.fields["pack:owner"]))) return { status: "not_found" };
  if (record.revokedAt !== null) return { status: "revoked", record };
  if (Date.now() >= record.expiresAt) return { status: "expired", record };
  if (opts?.countView !== false) {
    record.views = [...(record.views ?? []), Date.now()].slice(-50);
    await selectBackend().put(record);
  }
  return { status: "active", record };
}

export async function revokeShare(id: string, token: string | null): Promise<{ status: ShareStatus }> {
  const record = await selectBackend().get(id);
  if (!record || !token || token !== (record.fields["pack:owner"] ?? record.token)) return { status: "not_found" };
  if (record.revokedAt === null) {
    record.revokedAt = Date.now();
    await selectBackend().put(record);
  }
  return { status: "revoked" };
}

export async function resetShares(): Promise<void> {
  await selectBackend().clear();
}
