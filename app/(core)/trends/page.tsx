import { Suspense } from "react";
import { buildHealthMetrics, generateInsights } from "@/lib/analytics";
import { TrendsView } from "@/components/trends/TrendsView";

export default function TrendsPage() {
  const metrics = buildHealthMetrics();
  const insights = generateInsights();
  return (
    <Suspense>
      <TrendsView metrics={metrics} insights={insights} />
    </Suspense>
  );
}
