import type { MetadataRoute } from "next";

const SITE_URL = "https://www.vitalid.site";

// Only the public product pages are indexable. Shared health credentials
// (/shared/<token>), the API and every signed-in or demo screen stay out of
// search and AI indexes: they show personal (or synthetic demo) health data.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/$", "/pricing", "/brand", "/llms.txt"],
        disallow: [
          "/api/",
          "/shared/",
          "/share",
          "/checkout/",
          "/onboarding",
          "/signin",
          "/signup",
          "/welcome",
          "/trends",
          "/coach",
          "/community",
          "/connectors",
          "/focus",
          "/more",
          "/vital-id",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
