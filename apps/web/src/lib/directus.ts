import {
  createDirectus,
  readItems,
  readSingleton,
  rest,
  staticToken,
} from "@directus/sdk";

import { CMS_URL } from "@/lib/cms-url";

// ── Directus collection shapes (snake_case, only the fields we consume) ───────
// File fields are file UUID strings at default depth; O2M children come back
// expanded when requested via `fields`.

export interface DirectusService {
  id: number;
  slug: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  icon_name: string;
  popular: boolean | null;
  benefits: string[] | null;
  features: string[] | null;
  status: string;
  sort: number | null;
}

export interface DirectusProject {
  id: number;
  slug: string;
  title: string;
  client: string;
  category: string;
  location: string;
  area: string;
  completion_time: string;
  description: string;
  achievement: string;
  image: string | null;
  tags: string[] | null;
  testimonial_author: string | null;
  testimonial_role: string | null;
  testimonial_content: string | null;
  testimonial_rating: number | null;
  testimonial_avatar: string | null;
  status: string;
  sort: number | null;
}

export interface DirectusTestimonial {
  id: number;
  slug: string;
  author: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  avatar: string | null;
  category: string;
  status: string;
  sort: number | null;
}

export interface DirectusSectionLink {
  id: number;
  label: string | null;
  section_id: string | null;
}

export interface DirectusHeroSegment {
  id: number;
  text: string | null;
  color: string | null;
  italic: boolean | null;
  new_line_before: boolean | null;
}

export interface DirectusStat {
  id: number;
  value: string | null;
  label: string | null;
  color: string | null;
}

export interface DirectusBrandValue {
  id: number;
  title: string | null;
  description: string | null;
  icon: string | null;
  accent: string | null;
}

export interface DirectusProcessStep {
  id: number;
  num: string | null;
  title: string | null;
  description: string | null;
}

export interface DirectusSiteSettings {
  id: number;
  company_name: string | null;
  company_short_name: string | null;
  company_founded: string | null;
  company_phone: string | null;
  company_email: string | null;
  company_address: string | null;
  company_branch: string | null;
  company_motto: string | null;
  company_certification: string | null;
  social_facebook: string | null;
  social_zalo: string | null;
  social_messenger: string | null;
  branding_logo_text_primary: string | null;
  branding_logo_text_secondary: string | null;
  branding_header_tagline: string | null;
  branding_footer_tagline: string | null;
  navigation_header_cta_label: string | null;
  navigation_mobile_cta_label: string | null;
  typography_heading_font: string | null;
  typography_hero_display_font: string | null;
  typography_body_font: string | null;
  hero_background_image: string | null;
  hero_trust_badge: string | null;
  hero_subheadline: string | null;
  hero_benefits: string[] | null;
  hero_primary_cta_label: string | null;
  hero_primary_cta_href: string | null;
  hero_secondary_cta_label: string | null;
  hero_secondary_cta_href: string | null;
  hero_trust_strap: string | null;
  introduction_eyebrow: string | null;
  introduction_heading: string | null;
  introduction_narrative: string | null;
  introduction_image: string | null;
  introduction_motto_eyebrow: string | null;
  introduction_brand_story_heading: string | null;
  introduction_brand_story_intro: string | null;
  introduction_process_eyebrow: string | null;
  introduction_process_heading: string | null;
  introduction_process_intro: string | null;
  services_section_eyebrow: string | null;
  services_section_heading: string | null;
  services_section_description: string | null;
  projects_section_eyebrow: string | null;
  projects_section_heading: string | null;
  projects_section_description: string | null;
  testimonials_section_eyebrow: string | null;
  testimonials_section_heading: string | null;
  testimonials_section_description: string | null;
  footer_brand_description: string | null;
  footer_quick_links_heading: string | null;
  footer_offices_heading: string | null;
  footer_headquarters_label: string | null;
  footer_branch_label: string | null;
  footer_support_heading: string | null;
  footer_hotline_prefix: string | null;
  footer_email_prefix: string | null;
  footer_copyright_suffix: string | null;
  footer_back_to_top_label: string | null;
  contact_form_label_full_name: string | null;
  contact_form_label_phone: string | null;
  contact_form_label_email: string | null;
  contact_form_label_company: string | null;
  contact_form_label_address: string | null;
  contact_form_label_service_group: string | null;
  contact_form_label_service_select: string | null;
  contact_form_label_message: string | null;
  contact_section_eyebrow: string | null;
  contact_section_heading: string | null;
  contact_section_description: string | null;
  contact_section_success_heading: string | null;
  contact_section_success_body: string | null;
  contact_section_cta_label: string | null;
  seo_meta_title: string | null;
  seo_meta_description: string | null;
  seo_og_image: string | null;
  // O2M children (expanded via `fields`)
  nav_items: DirectusSectionLink[];
  footer_quick_links: DirectusSectionLink[];
  hero_headline_segments: DirectusHeroSegment[];
  stats: DirectusStat[];
  brand_values: DirectusBrandValue[];
  process_steps: DirectusProcessStep[];
}

export interface Schema {
  services: DirectusService[];
  projects: DirectusProject[];
  testimonials: DirectusTestimonial[];
  site_settings: DirectusSiteSettings; // singleton
  // O2M child collections of the singleton — registered so the SDK types
  // nested field expansion (e.g. `fields: ['*', { nav_items: ['*'] }]`).
  site_nav_items: DirectusSectionLink[];
  site_footer_links: DirectusSectionLink[];
  site_hero_segments: DirectusHeroSegment[];
  site_stats: DirectusStat[];
  site_brand_values: DirectusBrandValue[];
  site_process_steps: DirectusProcessStep[];
}

// Server-only base URL for SSR reads — in prod set CMS_INTERNAL_URL to the
// internal container address (http://cms:8055) so reads go direct over the
// docker network instead of hairpinning out through the public domain + TLS.
const SERVER_URL = process.env.CMS_INTERNAL_URL || CMS_URL;

// Read-only static token (server-only — never inlined into the client bundle).
const STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN ?? "";

// How long (seconds) published content stays cached before ISR revalidation.
const REVALIDATE_SECONDS = 300;

// A request-configured client. `draft` controls caching: preview reads bypass
// the cache; published reads use the ISR window. An 8s timeout keeps an
// unreachable CMS from hanging a render. Creating the client is cheap (no I/O),
// so we make one per call rather than hold cache policy as global state.
export const directusClient = (draft = false) =>
  createDirectus<Schema>(SERVER_URL)
    .with(staticToken(STATIC_TOKEN))
    .with(
      rest({
        onRequest: (options) =>
          ({
            ...options,
            signal: AbortSignal.timeout(8000),
            // `next` is a Next.js-only RequestInit extension; cast past the
            // SDK's stricter RequestInit type.
            ...(draft
              ? { cache: "no-store" }
              : { next: { revalidate: REVALIDATE_SECONDS } }),
          }) as typeof options,
      })
    );

export { readItems, readSingleton };
