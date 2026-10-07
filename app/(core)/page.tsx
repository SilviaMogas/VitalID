import type { Metadata } from "next";
import { resolveUserData } from "@/lib/user-data";
import { Dashboard } from "@/components/dashboard/Dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const data = await resolveUserData();
  return (
    <Dashboard
      metrics={data.metrics}
      missingMetrics={data.missingMetrics}
      insight={data.insights[0]}
      identity={data.identity}
      setup={data.setup}
      editable={data.owner === "member"}
      whoop={data.whoop}
    />
  );
}
