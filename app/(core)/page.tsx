import { resolveUserData } from "@/lib/user-data";
import { Dashboard } from "@/components/dashboard/Dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await resolveUserData();
  return (
    <Dashboard
      metrics={data.metrics}
      insight={data.insights[0]}
      identity={data.identity}
      setup={data.setup}
    />
  );
}
