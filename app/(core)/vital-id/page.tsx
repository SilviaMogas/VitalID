import { buildVitalIdSnapshot } from "@/lib/analytics";
import { VitalIdView } from "@/components/vital-id/VitalIdView";

export default function VitalIdPage() {
  return <VitalIdView snapshot={buildVitalIdSnapshot()} />;
}
