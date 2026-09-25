import { resolveUserData } from "@/lib/user-data";
import { VitalIdView } from "@/components/vital-id/VitalIdView";

export const dynamic = "force-dynamic";

export default async function VitalIdPage() {
  const data = await resolveUserData();
  return <VitalIdView snapshot={data.snapshot} />;
}
