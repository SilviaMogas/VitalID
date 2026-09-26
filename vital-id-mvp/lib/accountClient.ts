import { getItem, removeItem, setItem, STORAGE_KEYS } from "./storage";
import type { DailyEntry } from "./daily";

export interface AccountProfile {
  id: string;
  name: string;
  isDemo: false;
  joinedAt: number;
}

export function clearLocalJourney() {
  if(typeof window!=="undefined")sessionStorage.removeItem("vitalid.packDraft");
  const profile = getItem<{ id?: string }>(STORAGE_KEYS.profile);
  if (profile?.id) removeItem(STORAGE_KEYS.workFocus + "." + profile.id);
  for (const key of [
    STORAGE_KEYS.profile, STORAGE_KEYS.dailyHistory, STORAGE_KEYS.currentDaily,
    STORAGE_KEYS.transcript, STORAGE_KEYS.summary, STORAGE_KEYS.signals,
    STORAGE_KEYS.membership, STORAGE_KEYS.consent, STORAGE_KEYS.challenges,
    "vitalid.fatima.reflection", "vitalid.fatima.tomorrow", "vitalid.fatima.demoApps",
  ]) removeItem(key);
}

export async function activateAccount(): Promise<AccountProfile> {
  const response = await fetch("/api/account", { cache: "no-store" });
  const data = await response.json() as { profile?: AccountProfile; entries?: DailyEntry[]; error?: string };
  if (!response.ok || !data.profile) throw new Error(data.error || "Could not load your account.");
  clearLocalJourney();
  setItem(STORAGE_KEYS.profile, data.profile);
  setItem(STORAGE_KEYS.dailyHistory, data.entries ?? []);
  setItem(STORAGE_KEYS.membership, { plan: "free", status: "active" });
  return data.profile;
}
