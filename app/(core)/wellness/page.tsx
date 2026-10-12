import { WellnessView } from "@/components/wellness/WellnessView";

export const dynamic = "force-dynamic";

export default async function WellnessPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  return <WellnessView kind={kind === "supplement" ? "supplement" : "workout"} />;
}
