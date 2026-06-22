// Public origins, kept in their own SDK-free module so client components (e.g.
// the contact form) can import CMS_URL without pulling the Directus SDK into the
// client bundle. `||` (not `??`) so an empty-string build arg also falls back.

// Base URL of the decoupled Directus CMS. Public: the browser loads media from
// `${CMS_URL}/assets/<id>` and the contact form POSTs here.
export const CMS_URL =
  process.env.NEXT_PUBLIC_CMS_URL || "http://localhost:8055";

// Public origin of this web app. Used for canonical URLs, Open Graph, sitemap,
// robots, and JSON-LD.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
