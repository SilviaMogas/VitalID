import type { MetadataRoute } from "next";

const SITE_URL = "https://www.vitalid.site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/pricing`, changeFrequency: "monthly", priority: 0.7 },
  ];
}
