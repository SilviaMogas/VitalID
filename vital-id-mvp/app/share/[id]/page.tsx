import { getShare } from "@/lib/shareStore";
import RecipientClient from "./RecipientClient";

export const dynamic = "force-dynamic";

export default async function RecipientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;
  const { status, record } = await getShare(id, t ?? null);

  return (
    <RecipientClient
      id={id}
      token={t ?? ""}
      initial={
        status === "active" && record
          ? {
              status: "active" as const,
              recipientLabel: record.recipientLabel,
              fields: Object.fromEntries(Object.entries(record.fields).filter(([key]) => key !== "pack:owner")),
              expiresAt: record.expiresAt,
            }
          : { status: status as "expired" | "revoked" | "not_found" }
      }
    />
  );
}
