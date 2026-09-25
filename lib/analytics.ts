import {
  DEMO_EMERGENCY,
  DEMO_IDENTITY,
  DEMO_PROFILE,
  METRIC_META,
  METRIC_SOURCE,
  getDailyRecords,
} from "@/lib/demo-data";
import {
  METRIC_KEYS,
  type DailyRecord,
  type HealthMetric,
  type Insight,
  type MetricKey,
  type MetricPolarity,
  type TrendStatus,
  type VitalIdSnapshot,
} from "@/types";

/** Deterministic trend engine. All functions are pure. */

function series(records: DailyRecord[], metric: MetricKey): number[] {
  return records.map((r) => r[metric]);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function roundTo(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

export function get7DayAverage(records: DailyRecord[], metric: MetricKey): number {
  return roundTo(mean(series(records.slice(-7), metric)), METRIC_META[metric].decimals);
}

export function get30DayBaseline(records: DailyRecord[], metric: MetricKey): number {
  return roundTo(mean(series(records.slice(-30), metric)), METRIC_META[metric].decimals);
}

export function getDelta(current: number, baseline: number): { delta: number; deltaPercent: number } {
  const delta = current - baseline;
  const deltaPercent = baseline === 0 ? 0 : (delta / baseline) * 100;
  return { delta, deltaPercent };
}

/**
 * Status rules (current value relative to the 30-day baseline):
 *  |Δ%| < 5            → stable
 *  5 ≤ |Δ%| < 20       → improving / declining (sign adjusted for polarity)
 *  |Δ%| ≥ 20           → unusual deviation
 */
export function getTrend(
  current: number,
  baseline: number,
  polarity: MetricPolarity,
): TrendStatus {
  const { deltaPercent } = getDelta(current, baseline);
  const abs = Math.abs(deltaPercent);
  if (abs < 5) return "stable";
  if (abs >= 20) return "unusual";
  const positive = deltaPercent > 0;
  const good = polarity === "higherIsBetter" ? positive : !positive;
  return good ? "improving" : "declining";
}

/** Number of most-recent consecutive days a metric has been on the "worse" side of baseline. */
export function getConsecutiveDaysBelowBaseline(
  records: DailyRecord[],
  metric: MetricKey,
): number {
  const baseline = get30DayBaseline(records, metric);
  const polarity = METRIC_META[metric].polarity;
  let count = 0;
  for (let i = records.length - 1; i >= 0; i--) {
    const v = records[i][metric];
    const worse = polarity === "higherIsBetter" ? v < baseline : v > baseline;
    if (!worse) break;
    count++;
  }
  return count;
}

export function buildHealthMetric(records: DailyRecord[], metric: MetricKey): HealthMetric {
  const meta = METRIC_META[metric];
  const latest = records[records.length - 1];
  const value = latest[metric];
  const baseline = get30DayBaseline(records, metric);
  const sevenDayAverage = get7DayAverage(records, metric);
  const { delta, deltaPercent } = getDelta(value, baseline);
  return {
    metric,
    value,
    unit: meta.unit,
    timestamp: latest.date,
    source: METRIC_SOURCE[metric],
    baseline,
    sevenDayAverage,
    delta: roundTo(delta, meta.decimals),
    deltaPercent: Math.round(deltaPercent),
    status: getTrend(value, baseline, meta.polarity),
    polarity: meta.polarity,
    history: records.map((r) => ({ date: r.date, value: r[metric] })),
  };
}

export function buildHealthMetrics(records: DailyRecord[] = getDailyRecords()): HealthMetric[] {
  return METRIC_KEYS.map((m) => buildHealthMetric(records, m));
}

/**
 * Non-medical, deterministic insights. Returns i18n keys + params so the UI
 * can render them in any locale. Ordered by priority; the first is "today's insight".
 */
export function generateInsights(records: DailyRecord[] = getDailyRecords()): Insight[] {
  const insights: Insight[] = [];
  const metrics = buildHealthMetrics(records);
  const byKey = Object.fromEntries(metrics.map((m) => [m.metric, m])) as Record<MetricKey, HealthMetric>;

  const sleepStreak = getConsecutiveDaysBelowBaseline(records, "sleep");
  if (sleepStreak >= 2) {
    insights.push({
      id: "sleep-streak",
      key: "insight.sleepBelowBaselineStreak",
      params: { days: sleepStreak },
      metric: "sleep",
      severity: "attention",
    });
  }

  const rec = byKey.recovery;
  if (rec.status === "declining" || rec.status === "unusual") {
    insights.push({
      id: "recovery-down",
      key: "insight.recoveryBelowBaseline",
      params: { percent: Math.abs(rec.deltaPercent) },
      metric: "recovery",
      severity: "attention",
    });
  }

  const hrv = byKey.hrv;
  const rhr = byKey.restingHeartRate;
  if (hrv.deltaPercent < 0 && rhr.deltaPercent > 0) {
    insights.push({
      id: "hrv-rhr-shift",
      key: "insight.hrvDownRhrUp",
      params: {},
      metric: "hrv",
      severity: "info",
    });
  }

  const act = byKey.activity;
  if (act.status === "stable") {
    insights.push({
      id: "activity-stable",
      key: "insight.activityStable",
      params: { minutes: act.sevenDayAverage },
      metric: "activity",
      severity: "info",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "all-stable",
      key: "insight.allStable",
      params: {},
      metric: "recovery",
      severity: "info",
    });
  }
  return insights;
}

export function generateInsight(records: DailyRecord[] = getDailyRecords()): Insight {
  return generateInsights(records)[0];
}

export function buildVitalIdSnapshot(records: DailyRecord[] = getDailyRecords()): VitalIdSnapshot {
  const latest = records[records.length - 1];
  return {
    identity: DEMO_IDENTITY,
    emergencyInfo: DEMO_EMERGENCY,
    currentSignals: buildHealthMetrics(records),
    recentTrends: generateInsights(records),
    healthProfile: DEMO_PROFILE,
    sources: ["circularRing", "demoWearable", "manualProfile"],
    lastUpdated: `${latest.date}T08:00:00.000Z`,
  };
}
