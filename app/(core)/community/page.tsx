import { resolveUserData } from "@/lib/user-data";
import { CommunityView } from "@/components/community/CommunityView";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const data = await resolveUserData();
  return (
    <CommunityView
      city={data.setup?.profile.city || (data.owner === "fatima" ? "Dubai" : "")}
      goals={data.setup?.goals ?? []}
    />
  );
}
