import { buildHealthMetrics, generateInsight } from "@/lib/analytics";
import { DEMO_IDENTITY } from "@/lib/demo-data";
import { Dashboard } from "@/components/dashboard/Dashboard";

export default function HomePage() {
  const metrics = buildHealthMetrics();
  const insight = generateInsight();
  return <Dashboard metrics={metrics} insight={insight} identity={DEMO_IDENTITY} />;
}
