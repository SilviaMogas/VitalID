import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Indexing hints only; access checks remain responsible for privacy.
        source: "/shared/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      ...[
        "/", "/share/:path*", "/checkout/:path*", "/onboarding/:path*",
        "/signin/:path*", "/signup/:path*", "/welcome/:path*", "/trends/:path*",
        "/coach/:path*", "/community/:path*", "/connectors/:path*", "/focus/:path*",
        "/more/:path*", "/vital-id/:path*", "/wellness/:path*",
      ].map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      })),
    ];
  },
};

export default nextConfig;
