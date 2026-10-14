import type { VitalIdSnapshot } from "./health";

/** JSON contract for /api/mobile/v1. No server imports or credentials in account data. */
export interface MobileSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: { id: string; email: string | null };
}

export interface MobileAccount {
  user: { id: string; email: string | null };
  onboardingCompleted: boolean;
  plan: "free" | "plus" | "pro";
  consent: { healthCurrent: boolean; termsCurrent: boolean; privacyCurrent: boolean };
  versions: { health_data: string; terms_of_service: string; privacy_policy: string };
  durations: (15 | 60 | 1440)[];
}

export type MobileShareField =
  | "identity"
  | "emergencyInfo"
  | "currentSignals"
  | "recentTrends"
  | "healthProfile";

export interface MobileShareSummary {
  id: string;
  purpose: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
  selectedFields: MobileShareField[];
}

export interface MobileShare extends MobileShareSummary {
  sharedBy: string;
  snapshot: Partial<VitalIdSnapshot>;
}

export interface MobileShareInput {
  purpose: "custom";
  selectedFields: MobileShareField[];
  durationMinutes: 15 | 60 | 1440;
  recipientUserId: string;
  expectedSnapshot: Partial<VitalIdSnapshot>;
  authorized: true;
}
