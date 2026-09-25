import type {
  CreateVitalIdShareInput,
  GetVitalIdShareResult,
  ShareStore,
  VitalIdShareRecord,
} from './types';
import { buildShareRecord, invalidReason, isVitalIdShareValid, stripSnapshot } from './shared';

interface MemoryGlobal {
  __vitalIdShareStore?: Map<string, VitalIdShareRecord>;
}

/**
 * In-process fallback used when Supabase credentials are absent.
 * Backed by a Map on globalThis so it survives Next.js dev HMR reloads.
 * Data is lost on server restart — fine for local dev / demos.
 */
export class MemoryShareStore implements ShareStore {
  private readonly map: Map<string, VitalIdShareRecord>;

  constructor(map?: Map<string, VitalIdShareRecord>) {
    const g = globalThis as MemoryGlobal;
    if (map) {
      this.map = map;
    } else {
      g.__vitalIdShareStore ??= new Map();
      this.map = g.__vitalIdShareStore;
    }
  }

  async createVitalIdShare(input: CreateVitalIdShareInput): Promise<VitalIdShareRecord> {
    const record = buildShareRecord(input);
    if (this.map.has(record.token)) throw new Error('createVitalIdShare failed: duplicate token');
    this.map.set(record.token, record);
    return structuredClone(record);
  }

  async getVitalIdShareByToken(token: string): Promise<GetVitalIdShareResult> {
    const share = this.map.get(token);
    if (!share) return { valid: false, reason: 'not_found', share: null };
    const reason = invalidReason(share);
    if (reason) return { valid: false, reason, share: stripSnapshot(share) };
    return { valid: true, share: structuredClone(share) };
  }

  async revokeVitalIdShare(tokenOrId: string): Promise<boolean> {
    const share =
      this.map.get(tokenOrId) ?? Array.from(this.map.values()).find((s) => s.id === tokenOrId);
    if (!share) return false;
    this.map.set(share.token, { ...share, revoked: true });
    return true;
  }

  isVitalIdShareValid(record: VitalIdShareRecord, now?: Date): boolean {
    return isVitalIdShareValid(record, now);
  }

  async listVitalIdShares() {
    return Array.from(this.map.values())
      .map((record) => {
        const summary = stripSnapshot(record);
        const sentTo = record.snapshot.sentTo;
        return sentTo === undefined ? summary : { ...summary, sentTo: structuredClone(sentTo) };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async clearVitalIdShares(): Promise<void> {
    this.map.clear();
  }
}
