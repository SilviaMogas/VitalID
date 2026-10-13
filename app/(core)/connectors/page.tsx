import { ConnectorsView } from "@/components/connectors/ConnectorsView";
import { resolveUserData } from "@/lib/user-data";

export const dynamic = "force-dynamic";

export default async function ConnectorsPage() {
  const data = await resolveUserData();
  return <ConnectorsView whoop={data.whoop} />;
}
