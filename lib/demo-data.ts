import type {
  DailyRecord,
  EmergencyInfo,
  HealthProfile,
  Identity,
  MetricKey,
  MetricPolarity,
} from "@/types";

/**
 * Deterministic 30-day synthetic dataset. Fictional demo data only.
 * Values depend only on day index, so every reload produces the same story:
 *  - sleep drops below baseline for the last 3 nights
 *  - recovery falls with it
 *  - HRV drifts down slightly, resting heart rate drifts up slightly
 *  - activity stays stable
 */

export const DEMO_DAYS = 30;

function seeded(seed: number): number {
  // mulberry32
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function noise(day: number, channel: number, amplitude: number): number {
  return (seeded(day * 31 + channel * 7919) - 0.5) * 2 * amplitude;
}

function round(n: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function isoDate(daysAgo: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export function getDailyRecords(): DailyRecord[] {
  const records: DailyRecord[] = [];
  for (let i = 0; i < DEMO_DAYS; i++) {
    const daysAgo = DEMO_DAYS - 1 - i;
    const isRecent = daysAgo <= 2; // last 3 nights
    const weekendBoost = i % 7 === 5 || i % 7 === 6 ? 0.4 : 0;

    const sleep = isRecent
      ? 5.6 + noise(i, 1, 0.35) + (2 - daysAgo) * -0.15
      : 7.4 + weekendBoost + noise(i, 1, 0.5);

    const recovery = isRecent
      ? 61 + noise(i, 2, 4) - (2 - daysAgo) * 2
      : 74 + noise(i, 2, 7);

    const hrv = isRecent ? 52 + noise(i, 3, 3) : 62 + noise(i, 3, 5) + (i > 22 ? -2 : 0);

    const restingHeartRate = isRecent
      ? 61 + noise(i, 4, 1.5)
      : 56 + noise(i, 4, 2);

    const activity = 48 + weekendBoost * 40 + noise(i, 5, 14);

    records.push({
      date: isoDate(daysAgo),
      recovery: Math.max(0, Math.min(100, round(recovery))),
      sleep: round(Math.max(3.5, sleep), 1),
      hrv: round(Math.max(20, hrv)),
      restingHeartRate: round(Math.max(40, restingHeartRate)),
      activity: round(Math.max(0, activity)),
    });
  }
  return records;
}

export const METRIC_META: Record<
  MetricKey,
  { unit: string; polarity: MetricPolarity; decimals: number }
> = {
  recovery: { unit: "%", polarity: "higherIsBetter", decimals: 0 },
  sleep: { unit: "h", polarity: "higherIsBetter", decimals: 1 },
  hrv: { unit: "ms", polarity: "higherIsBetter", decimals: 0 },
  restingHeartRate: { unit: "bpm", polarity: "lowerIsBetter", decimals: 0 },
  activity: { unit: "min", polarity: "higherIsBetter", decimals: 0 },
};

export const DEMO_IDENTITY: Identity = {
  fullName: "Fatima Al Mansoori",
  vitalId: "VID-AE-10284",
  dateOfBirth: "1991-03-14",
  sex: "female",
  nationality: "AE",
};

export const DEMO_EMERGENCY: EmergencyInfo = {
  bloodType: "O+",
  allergies: ["penicillin"],
  conditions: [],
  emergencyContact: {
    name: "Khalid Al Mansoori",
    relation: "brother",
    phone: "+971 50 000 0000",
  },
};

export const DEMO_PROFILE: HealthProfile = {
  heightCm: 165,
  weightKg: 58,
  medications: [],
};
