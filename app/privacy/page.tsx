import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <LegalDocument kind="privacy" />;
}
