import type { MetadataRoute } from "next";

import { SITE_URL } from "../data";

// The site is a single landing page (hash-anchored sections), so the sitemap is
// effectively the one canonical URL. Emitting it still helps crawlers.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
