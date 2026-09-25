import SharedViewClient from "@/components/share/SharedViewClient";

export const dynamic = "force-dynamic";

export default async function SharedPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharedViewClient id={token} />;
}
