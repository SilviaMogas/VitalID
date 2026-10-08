import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { isLegalDoc, legalTitle } from "@/lib/legal";

/**
 * Single route serving the two public legal documents, /privacy and /terms.
 * Only those slugs resolve (dynamicParams = false); anything else 404s.
 */

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ doc: "privacy" }, { doc: "terms" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ doc: string }>;
}): Promise<Metadata> {
  const { doc } = await params;
  return isLegalDoc(doc)
    ? { title: legalTitle(doc), alternates: { canonical: `/${doc}` } }
    : {};
}

export default async function LegalRoute({
  params,
}: {
  params: Promise<{ doc: string }>;
}) {
  const { doc } = await params;
  if (!isLegalDoc(doc)) notFound();
  return <LegalDocument kind={doc} />;
}
