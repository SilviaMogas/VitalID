import { resolveUserData } from "@/lib/user-data";
import { FocusView } from "@/components/focus/FocusView";

export const dynamic = "force-dynamic";

export default async function FocusPage() {
  const data = await resolveUserData();
  return <FocusView identity={data.identity} />;
}
