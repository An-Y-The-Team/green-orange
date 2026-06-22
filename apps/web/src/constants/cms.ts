// Publish state of versioned CMS content (services/projects/testimonials).
// The free-tier Directus permission layer can't filter by status, so the live
// site filters `status = published` at query time (see data.ts); preview/draft
// mode drops the filter to surface drafts.
export enum ContentStatus {
  PUBLISHED = "published",
  DRAFT = "draft",
}
