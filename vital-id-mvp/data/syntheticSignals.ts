import type { Lang } from "@/lib/i18n";
import type { WhoopSignals } from "@/lib/whoop";

export interface Localized {
  en: string;
  ar: string;
}

export type SignalSource = "synthetic" | "whoop" | "circular-sample";

export interface StoredSignals {
  source: SignalSource;
  tiles: SignalTile[];
  fetchedAt?: number;
  firstName?: string | null;
}

export interface SignalTile {
  id: string;
  key: "sleep" | "rhr" | "hrv" | "recovery";
  value: Localized;
  sub?: Localized;
  week?: number[];
}

// All values below are synthetic demo data. Nothing is imported from WHOOP or any device.
export const syntheticSignals: SignalTile[] = [
  {
    id: "sig-sleep",
    key: "sleep",
    value: { en: "5h 40m", ar: "5 س 40 د" },
    sub: { en: "Performance 68%", ar: "الأداء 68%" },
    week: [6.2, 7.1, 5.5, 6.8, 7.4, 5.2, 5.7],
  },
  { id: "sig-rhr", key: "rhr", value: { en: "64 bpm", ar: "64 نبضة/د" }, week: [66, 65, 64, 63, 65, 64, 64] },
  { id: "sig-hrv", key: "hrv", value: { en: "38 ms", ar: "38 مللي ثانية" }, week: [42, 40, 36, 44, 39, 35, 38] },
  { id: "sig-recovery", key: "recovery", value: { en: "54%", ar: "54%" }, week: [62, 71, 48, 66, 58, 51, 54] },
];

export function formatSignalValue(signal: SignalTile, lang: Lang): string {
  return signal.value[lang];
}

export function signalTileByKey(key: string, stored?: StoredSignals | null): SignalTile | undefined {
  if (stored) {
    const hit = stored.tiles.find((s) => s.key === key);
    if (hit) return hit;
  }
  return syntheticSignals.find((s) => s.key === key);
}

function locSleep(mins: number): Localized {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return { en: `${h}h ${m}m`, ar: `${h} س ${m} د` };
}

export function tilesFromWhoop(s: WhoopSignals): SignalTile[] {
  return [
    {
      id: "sig-sleep",
      key: "sleep",
      value: s.sleepMinutes != null ? locSleep(s.sleepMinutes) : { en: "—", ar: "—" },
      sub:
        s.sleepPerformance != null
          ? { en: `Performance ${s.sleepPerformance}%`, ar: `الأداء ${s.sleepPerformance}%` }
          : undefined,
      week: s.week.sleepHours,
    },
    {
      id: "sig-rhr",
      key: "rhr",
      value: { en: s.rhr != null ? `${s.rhr} bpm` : "—", ar: s.rhr != null ? `${s.rhr} نبضة/د` : "—" },
      week: s.week.rhr,
    },
    {
      id: "sig-hrv",
      key: "hrv",
      value: { en: s.hrv != null ? `${s.hrv} ms` : "—", ar: s.hrv != null ? `${s.hrv} مللي ثانية` : "—" },
      week: s.week.hrv,
    },
    {
      id: "sig-recovery",
      key: "recovery",
      value: { en: s.recovery != null ? `${s.recovery}%` : "—", ar: s.recovery != null ? `${s.recovery}%` : "—" },
      week: s.week.recovery,
    },
  ];
}
