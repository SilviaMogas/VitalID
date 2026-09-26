import type { NextConfig } from "next";
const privacyHeaders = [
  {key:"Cache-Control",value:"private, no-store"},
  {key:"Referrer-Policy",value:"no-referrer"},
  {key:"X-Content-Type-Options",value:"nosniff"},
  {key:"X-Robots-Tag",value:"noindex, nofollow"},
];
const nextConfig: NextConfig = {
  async headers() {
    return [
      {source:"/share/:path*",headers:privacyHeaders},
      {source:"/api/shares/:path*",headers:privacyHeaders},
      {source:"/onboarding",headers:privacyHeaders},
    ];
  },
};
export default nextConfig;
