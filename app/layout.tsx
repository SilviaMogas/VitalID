import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vital ID",
  description: "Secure, temporary sharing of your health snapshot.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-full bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
