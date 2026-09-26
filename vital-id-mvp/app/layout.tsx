import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import VoiceProvider from "@/components/VoiceProvider";
import TopBar from "@/components/TopBar";

export const metadata: Metadata = {
  title: "Vita Lady",
  description: "Your wellbeing, daily reflections and tomorrow’s plans, together.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>
        <Providers>
          <VoiceProvider>
          <div className="phone-frame">
            <TopBar />
            <main className="flex-1 px-5 pb-8">{children}</main>
          </div>
          </VoiceProvider>
        </Providers>
      </body>
    </html>
  );
}
