import { resolveUserData } from "@/lib/user-data";
import { buildRecommendations } from "@/lib/coach";
import { CoachView } from "@/components/coach/CoachView";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const data = await resolveUserData();
  const goals = data.setup?.goals ?? [];
  const recs = buildRecommendations({
    metrics: data.metrics,
    goals,
    baseline: data.setup?.baseline ?? null,
  });
  return (
    <CoachView
      recommendations={recs}
      metrics={data.metrics}
      goals={goals}
      identity={data.identity}
      owner={data.owner}
    />
  );
}
