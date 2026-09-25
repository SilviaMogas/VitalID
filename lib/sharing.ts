export type ShareField = 'identity' | 'emergency' | 'signals' | 'trends' | 'profile';
export type SharePurpose = 'emergency' | 'doctor' | 'travel' | 'caregiver' | 'custom';
export type ShareDuration = 15 | 60 | 1440; // minutes

export interface HealthMetric {
  metric: string;
  value: number;
  unit: string;
  timestamp: string;
  source: string;
  baseline?: number;
  delta?: number;
  status: 'normal' | 'watch' | 'attention';
}

export interface VitalIdSnapshot {
  identity: {
    name: string;
    dateOfBirth: string;
    bloodType: string;
    vitalId: string;
  };
  emergency: {
    emergencyContact: { name: string; relation: string; phone: string };
    allergies: string[];
    conditions: string[];
    medications: string[];
  };
  signals: HealthMetric[];
  trends: {
    metric: string;
    period: '7D' | '30D';
    direction: 'up' | 'down' | 'stable';
    summary: string;
    source: string;
  }[];
  profile: {
    height: string;
    weight: string;
    lifestyle: string[];
    notes: string;
  };
}

export interface SharePayload {
  id: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
  purpose: SharePurpose;
  selectedFields: ShareField[];
  sharedBy: string;
  snapshot: Partial<VitalIdSnapshot>;
}

export const PURPOSE_PRESETS: Record<SharePurpose, ShareField[]> = {
  emergency: ['identity', 'emergency', 'signals'],
  doctor: ['identity', 'signals', 'trends', 'profile'],
  travel: ['identity', 'emergency'],
  caregiver: ['identity', 'emergency', 'signals', 'trends'],
  custom: ['identity'],
};

export const SHARE_FIELDS: ShareField[] = ['identity', 'emergency', 'signals', 'trends', 'profile'];
export const SHARE_DURATIONS: ShareDuration[] = [15, 60, 1440];
export const SHARE_PURPOSES: SharePurpose[] = ['emergency', 'doctor', 'travel', 'caregiver', 'custom'];

/** Copies ONLY the selected top-level keys from the full snapshot. */
export function buildSnapshot(full: VitalIdSnapshot, fields: ShareField[]): Partial<VitalIdSnapshot> {
  const out: Partial<VitalIdSnapshot> = {};
  for (const f of fields) {
    out[f] = full[f] as never;
  }
  return out;
}

export function isShareActive(p: SharePayload, now = Date.now()): boolean {
  return !p.revoked && new Date(p.expiresAt).getTime() > now;
}
