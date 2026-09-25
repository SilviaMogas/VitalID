/**
 * Public entry point for other modules (e.g. the sharing flow).
 * Everything here is deterministic and safe to call on server or client.
 */
export {
  buildHealthMetrics,
  buildVitalIdSnapshot,
  generateInsight,
  generateInsights,
  get7DayAverage,
  get30DayBaseline,
  getDelta,
  getTrend,
} from "@/lib/analytics";
export { getDailyRecords, METRIC_META } from "@/lib/demo-data";
export type * from "@/types";
