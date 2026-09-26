export const STORAGE_KEYS = {
  lang: "vitalid.lang",
  consent: "vitalid.consent",
  transcript: "vitalid.transcript",
  includeSignals: "vitalid.includeSignals",
  signals: "vitalid.signals",
  summary: "vitalid.summary",
  shares: "vitalid.shares",
  dailyHistory: "vitalid.dailyHistory",
  currentDaily: "vitalid.currentDaily",
  profile: "vitalid.profile",
  membership: "vitalid.membership",
  challenges: "vitalid.challenges",
  workFocus: "vitalid.workFocus",
  a11y: "vitalid.a11y",
} as const;

export function getItem<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function setItem(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable; ignore
  }
}

export function removeItem(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

export interface IssuedLink {
  id: string;
  token: string;
  recipientLabel: string;
  expiresAt: number;
  revokedAt: number | null;
  url: string;
}
