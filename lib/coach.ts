import type { HealthMetric, MetricKey } from "@/types";
import type { GoalId, Baseline } from "@/lib/onboarding/types";

export type CoachArea = "activity" | "nutrition" | "sleep" | "progress" | "mood" | "lifestyle";

export const COACH_AREAS: CoachArea[] = [
  "activity",
  "nutrition",
  "sleep",
  "progress",
  "mood",
  "lifestyle",
];

export interface Recommendation {
  id: string;
  area: CoachArea;
  /** i18n key for the recommendation text. */
  key: string;
  params: Record<string, string | number>;
  /** i18n key explaining which goal/signal this matches. */
  reasonKey: string;
  reasonParams: Record<string, string | number>;
  metric?: MetricKey;
  /** Lower = shown first. */
  priority: number;
}

/** Signed delta is "worse" when it moves against the metric's polarity. */
function isWorse(m: HealthMetric): boolean {
  return m.polarity === "higherIsBetter" ? m.deltaPercent < 0 : m.deltaPercent > 0;
}

function worseSignal(m: HealthMetric): boolean {
  return (m.status === "declining" || m.status === "unusual") && isWorse(m);
}

function pct(m: HealthMetric): number {
  return Math.abs(Math.round(m.deltaPercent));
}

export function buildRecommendations(input: {
  metrics: HealthMetric[];
  goals: GoalId[];
  baseline: Baseline | null;
}): Recommendation[] {
  const { metrics, goals, baseline } = input;
  const byMetric = (key: MetricKey) => metrics.find((m) => m.metric === key);
  const recs: Recommendation[] = [];

  const sleep = byMetric("sleep");
  if (sleep && worseSignal(sleep)) {
    recs.push({
      id: "sleep-below",
      area: "sleep",
      key: "coach.rec.sleepBelow",
      params: { percent: pct(sleep) },
      reasonKey: "coach.reason.signal",
      reasonParams: { metric: sleep.metric },
      metric: sleep.metric,
      priority: goals.includes("sleep") ? 0 : 1,
    });
  }

  const recovery = byMetric("recovery");
  if (recovery && worseSignal(recovery)) {
    recs.push({
      id: "recovery-low",
      area: "sleep",
      key: "coach.rec.recoveryLow",
      params: { percent: pct(recovery) },
      reasonKey: "coach.reason.signal",
      reasonParams: { metric: recovery.metric },
      metric: recovery.metric,
      priority: 2,
    });
  }

  const hrv = byMetric("hrv");
  const rhr = byMetric("restingHeartRate");
  if (hrv && rhr && worseSignal(hrv) && worseSignal(rhr)) {
    recs.push({
      id: "stress-signal",
      area: "mood",
      key: "coach.rec.stressSignal",
      params: {},
      reasonKey: "coach.reason.signal",
      reasonParams: { metric: hrv.metric },
      metric: hrv.metric,
      priority: 3,
    });
  }

  const activity = byMetric("activity");
  const wantsFitness = goals.includes("fitness") || goals.includes("loseWeight");
  if (activity && wantsFitness && !worseSignal(activity)) {
    recs.push({
      id: "walk-30",
      area: "activity",
      key: "coach.rec.walk30",
      params: {},
      reasonKey: "coach.reason.goal",
      reasonParams: { goal: goals.includes("fitness") ? "fitness" : "loseWeight" },
      metric: activity.metric,
      priority: 4,
    });
  } else if (activity && worseSignal(activity)) {
    recs.push({
      id: "activity-dip",
      area: "activity",
      key: "coach.rec.activityDip",
      params: { percent: pct(activity) },
      reasonKey: "coach.reason.signal",
      reasonParams: { metric: activity.metric },
      metric: activity.metric,
      priority: 4,
    });
  }

  const nutritionGoal = goals.includes("gainMuscle") ? "gainMuscle" : goals.includes("nutrition") ? "nutrition" : null;
  if (nutritionGoal) {
    if (baseline?.proteinTargetG) {
      recs.push({
        id: "protein-target",
        area: "nutrition",
        key: "coach.rec.proteinTarget",
        params: { target: baseline.proteinTargetG },
        reasonKey: "coach.reason.goal",
        reasonParams: { goal: nutritionGoal },
        priority: 5,
      });
    } else {
      recs.push({
        id: "protein",
        area: "nutrition",
        key: "coach.rec.protein",
        params: { goal: nutritionGoal },
        reasonKey: "coach.reason.goal",
        reasonParams: { goal: nutritionGoal },
        priority: 5,
      });
    }
  }

  if (baseline?.hydrationGoalMl) {
    recs.push({
      id: "hydration",
      area: "nutrition",
      key: "coach.rec.hydration",
      params: { liters: Math.round((baseline.hydrationGoalMl / 1000) * 10) / 10 },
      reasonKey: "coach.reason.general",
      reasonParams: {},
      priority: 6,
    });
  }

  const moodGoal = goals.includes("stress") ? "stress" : goals.includes("wellbeing") ? "wellbeing" : null;
  if (moodGoal) {
    recs.push({
      id: "mindful-minutes",
      area: "mood",
      key: "coach.rec.mindfulMinutes",
      params: {},
      reasonKey: "coach.reason.goal",
      reasonParams: { goal: moodGoal },
      priority: 7,
    });
  }

  const allGood = metrics.length > 0 && metrics.every((m) => m.status === "stable" || m.status === "improving");
  if (allGood) {
    recs.push({
      id: "on-track",
      area: "progress",
      key: "coach.rec.onTrack",
      params: {},
      reasonKey: "coach.reason.general",
      reasonParams: {},
      priority: 8,
    });
  }

  if (goals.length === 0) {
    recs.push({
      id: "set-goals",
      area: "lifestyle",
      key: "coach.rec.setGoals",
      params: {},
      reasonKey: "coach.reason.general",
      reasonParams: {},
      priority: 9,
    });
  }

  recs.sort((a, b) => a.priority - b.priority);
  const top = recs.slice(0, 6);

  const fallbacks: Recommendation[] = [
    {
      id: "fallback-sleep8",
      area: "sleep",
      key: "coach.rec.sleep8",
      params: {},
      reasonKey: "coach.reason.general",
      reasonParams: {},
      priority: 100,
    },
    {
      id: "fallback-walk30",
      area: "activity",
      key: "coach.rec.walk30",
      params: {},
      reasonKey: "coach.reason.general",
      reasonParams: {},
      priority: 101,
    },
    {
      id: "fallback-ontrack",
      area: "progress",
      key: "coach.rec.onTrack",
      params: {},
      reasonKey: "coach.reason.general",
      reasonParams: {},
      priority: 102,
    },
  ];
  const seen = new Set(top.map((r) => r.key));
  for (const f of fallbacks) {
    if (top.length >= 3) break;
    if (seen.has(f.key)) continue;
    seen.add(f.key);
    top.push(f);
  }

  return top;
}
