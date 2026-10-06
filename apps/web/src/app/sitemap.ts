import type { MetadataRoute } from "next";

import { SITE_URL } from "../data";

// The marketing site is a single landing page (hash-anchored sections), plus
// the mini app's terms of use — a standalone page because Zalo's app review
// requires a public, linkable terms URL.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/dieu-khoan-su-dung`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
