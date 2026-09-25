import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import { MembershipProvider } from "@/components/providers/MembershipProvider";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Vital ID",
  description: "Your portable health identity",
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
        <LocaleProvider>
          <MembershipProvider>
            <AppShell>{children}</AppShell>
          </MembershipProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
