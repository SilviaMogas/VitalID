import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import { MembershipProvider } from "@/components/providers/MembershipProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { VoiceProvider } from "@/components/providers/VoiceProvider";
import { AppShell } from "@/components/layout/AppShell";
import { Analytics } from "@vercel/analytics/next";

const SITE_URL = "https://www.vitalid.site";
const DESCRIPTION =
  "Vital ID is your portable health identity: see your wearable signals against your own baseline, then share only the fields you choose through a temporary, revocable link or QR code. English and Arabic.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Vital ID — Your portable health identity", template: "%s · Vital ID" },
  description: DESCRIPTION,
  applicationName: "Vital ID",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Vital ID",
    title: "Vital ID — Your portable health identity",
    description: DESCRIPTION,
    locale: "en_US",
    alternateLocale: ["ar_AE"],
  },
  twitter: { card: "summary_large_image", title: "Vital ID — Your portable health identity", description: DESCRIPTION },
};

// Describes the product for search engines and AI assistants. Facts only:
// no ratings, prices or medical claims.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Vital ID",
  url: SITE_URL,
  description: DESCRIPTION,
  applicationCategory: "HealthApplication",
  operatingSystem: "Web",
  inLanguage: ["en", "ar"],
  featureList: [
    "Wearable signals compared with a personal baseline",
    "7-day and 30-day trends",
    "Explainable insights (not medical advice)",
    "Selective, field-level sharing by temporary, revocable link or QR code",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f6f9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
        <LocaleProvider>
          <AuthProvider>
            <MembershipProvider>
              <VoiceProvider>
                <AppShell>{children}</AppShell>
              </VoiceProvider>
            </MembershipProvider>
          </AuthProvider>
        </LocaleProvider>
        <Analytics />
      </body>
    </html>
  );
}
