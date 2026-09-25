import { Suspense } from "react";
import { resolveUserData } from "@/lib/user-data";
import { TrendsView } from "@/components/trends/TrendsView";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  const data = await resolveUserData();
  return (
    <Suspense>
      <TrendsView metrics={data.metrics} insights={data.insights} />
    </Suspense>
  );
}
