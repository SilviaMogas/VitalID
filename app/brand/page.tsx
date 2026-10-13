import type { Metadata } from "next";
import { BrandKit } from "@/components/brand/BrandKit";

export const metadata: Metadata = {
  title: "Brand kit",
  description: "Vital ID logos, colours, type, mascot crew and launch assets, with usage guidelines.",
  alternates: { canonical: "/brand" },
};

export default function BrandPage() {
  return <BrandKit />;
}
