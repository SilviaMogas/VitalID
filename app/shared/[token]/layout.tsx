import type { Metadata } from "next";

// A shared Vital ID is a private, temporary health credential. It must never
// be indexed, cached by search engines or followed, even if a link leaks.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function SharedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
