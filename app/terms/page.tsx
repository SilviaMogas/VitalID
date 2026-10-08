import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Terms of Service",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <LegalDocument kind="terms" />;
}
