import type { Insurer, InsurerId } from "@/lib/insurers";
import { getInsurer } from "@/lib/insurers";

/** Insurer's colored monogram circle — the one bit of markup every insurer list repeats. */
export function InsurerMonogram({
  insurer,
  className = "h-5 w-5 text-[9px]",
}: {
  insurer: Insurer;
  /** Controls size/text — callers own their own layout (ring, grid gaps, etc). */
  className?: string;
}) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-bold text-white ${className}`}
      style={{ backgroundColor: insurer.color }}
    >
      {insurer.monogram}
    </span>
  );
}

/** Resolves each recipient's insurer once, dropping any id no longer in the catalog. */
export function resolveRecipients<R extends { insurerId: InsurerId }>(
  sentTo: R[] | undefined,
): { recipient: R; insurer: Insurer }[] {
  const out: { recipient: R; insurer: Insurer }[] = [];
  for (const recipient of sentTo ?? []) {
    const insurer = getInsurer(recipient.insurerId);
    if (insurer) out.push({ recipient, insurer });
  }
  return out;
}
