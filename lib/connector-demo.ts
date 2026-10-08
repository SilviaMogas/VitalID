import { PROVIDERS, KIND_TO_METRIC, type ProviderId } from "@/lib/connectors";
import { getDailyRecords } from "@/lib/demo-data";
import { buildMetricFromSeries } from "@/lib/analytics";

/** Read-only product examples. Never resolve a session or write member data. */
export function connectorDemo(provider: ProviderId) {
  const def = PROVIDERS[provider];
  if (!def.sampleData) return [];
  const metrics = [...new Set(def.data.flatMap((kind) => {
    const metric = KIND_TO_METRIC[kind];
    return metric ? [metric] : [];
  }))];
  const records = getDailyRecords();
  return metrics.map((metric) => buildMetricFromSeries(
    metric, records.map((r) => ({ date: r.date, value: r[metric] })), "demoWearable",
  ));
}
