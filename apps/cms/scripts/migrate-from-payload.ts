/**
 * One-time PROD data migration: Payload CMS → Directus.
 *
 * Unlike seed/seed.ts (stable DEMO data), this pulls the REAL, editor-curated
 * content out of a Payload export and writes it into Directus, importing the
 * uploaded media along the way. Idempotent: upsert-by-slug for collections,
 * patch for the singleton, reset for O2M children, dedupe media by URL.
 *
 * ── INPUT (two modes) ────────────────────────────────────────────────────────
 *   A) Live fetch:  set PAYLOAD_URL (+ optional PAYLOAD_API_KEY) and the script
 *      reads Payload's REST API directly. Requires network access to prod.
 *   B) File mode (default): drop the exported JSON into PAYLOAD_EXPORT_DIR
 *      (default ./payload-export) as services.json / projects.json /
 *      testimonials.json / site-settings.json (and optionally contact-submissions.json).
 *      Each *collection* file is the raw Payload list response ({ docs: [...] });
 *      site-settings.json is the raw global object.
 *      Export the global at depth>=1 so its images resolve to { url }.
 *
 * ── OUTPUT ───────────────────────────────────────────────────────────────────
 *   Writes to Directus at DIRECTUS_PUBLIC_URL using DIRECTUS_ADMIN_EMAIL/PASSWORD.
 *   Media is imported from the absolute URLs in the export (the prod CMS must be
 *   reachable from the Directus host while it runs).
 *
 * Run (Bun, per AGENTS.md), file mode:
 *   DIRECTUS_PUBLIC_URL=http://localhost:8055 DIRECTUS_ADMIN_EMAIL=admin@example.com \
 *   DIRECTUS_ADMIN_PASSWORD=admin PAYLOAD_EXPORT_DIR=./payload-export \
 *   bun apps/cms/scripts/migrate-from-payload.ts
 *
 * Live mode adds: PAYLOAD_URL=https://cms.dichvuyan.com PAYLOAD_API_KEY=<key>
 * Leads (PII): set MIGRATE_LEADS=true to also import contact_submissions.
 */

const BASE = process.env.DIRECTUS_PUBLIC_URL ?? 'http://localhost:8055'
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL ?? 'admin@example.com'
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD ?? 'admin'
const PAYLOAD_URL = process.env.PAYLOAD_URL ?? ''
const PAYLOAD_API_KEY = process.env.PAYLOAD_API_KEY ?? ''
const EXPORT_DIR = process.env.PAYLOAD_EXPORT_DIR ?? './payload-export'
const MIGRATE_LEADS = process.env.MIGRATE_LEADS === 'true'

let token = ''

const directus = async (method: string, path: string, body?: unknown): Promise<unknown> => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text}`)
  return text ? JSON.parse(text) : null
}

// ─── Read the Payload export (live REST or local JSON file) ──────────────────
const loadPayload = async ({
  resource,
  query,
}: {
  resource: string
  query: string
}): Promise<unknown> => {
  if (PAYLOAD_URL) {
    const url = `${PAYLOAD_URL}/api/${resource}${query}`
    const res = await fetch(url, {
      headers: PAYLOAD_API_KEY ? { Authorization: `users API-Key ${PAYLOAD_API_KEY}` } : {},
    })
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status}: ${await res.text()}`)
    return res.json()
  }
  // File mode: resource "globals/site-settings" → site-settings.json
  const file = `${EXPORT_DIR}/${resource.replace('globals/', '')}.json`
  return Bun.file(file).json()
}

// ─── Generic Payload shapes (defensive — prod data may vary) ─────────────────
type Json = Record<string, unknown>
const asArray = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : [])
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null)

// Payload `array of { item }` (or already string[]) → string[].
const itemArray = (v: unknown): string[] =>
  asArray(v)
    .map((o) => (typeof o === 'string' ? o : str(o.item)))
    .filter((x): x is string => Boolean(x))

// An upload field: absolute url string, or populated media object { url }, else null.
const mediaUrl = (v: unknown): string | null => {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object' && typeof (v as Json).url === 'string')
    return (v as Json).url as string
  return null
}

// ─── Media import (dedupe by URL) ────────────────────────────────────────────
const imageCache = new Map<string, string>()
const importImage = async (url: string | null): Promise<string | null> => {
  if (!url) return null
  const cached = imageCache.get(url)
  if (cached) return cached
  try {
    const res = (await directus('POST', '/files/import', { url })) as { data: { id: string } }
    imageCache.set(url, res.data.id)
    return res.data.id
  } catch (error: unknown) {
    console.warn(
      `  ! image import failed (${url}): ${error instanceof Error ? error.message : error}`,
    )
    return null
  }
}

const findIdBySlug = async (collection: string, slug: string): Promise<string | null> => {
  const res = (await directus(
    'GET',
    `/items/${collection}?filter[slug][_eq]=${encodeURIComponent(slug)}&fields=id&limit=1`,
  )) as { data: { id: string }[] }
  return res.data[0]?.id ?? null
}

const upsertBySlug = async ({
  collection,
  slug,
  data,
  onCreate,
}: {
  collection: string
  slug: string
  data: Json
  onCreate?: () => Promise<Json>
}): Promise<void> => {
  const id = await findIdBySlug(collection, slug)
  if (id) {
    await directus('PATCH', `/items/${collection}/${id}`, data)
    return
  }
  const extra = onCreate ? await onCreate() : {}
  await directus('POST', `/items/${collection}`, { ...data, ...extra })
}

const statusOf = (doc: Json): string => (str(doc._status) === 'draft' ? 'draft' : 'published')

const resetChildren = async ({
  collection,
  settingsId,
  rows,
}: {
  collection: string
  settingsId: number
  rows: Json[]
}): Promise<void> => {
  const existing = (await directus('GET', `/items/${collection}?fields=id&limit=-1`)) as {
    data: { id: number }[]
  }
  const ids = existing.data.map((r) => r.id)
  if (ids.length > 0) await directus('DELETE', `/items/${collection}`, ids)
  let sort = 0
  for (const row of rows) {
    await directus('POST', `/items/${collection}`, { ...row, site_settings: settingsId, sort })
    sort += 1
  }
}

const main = async (): Promise<void> => {
  console.log(`Source: ${PAYLOAD_URL ? `live ${PAYLOAD_URL}` : `files in ${EXPORT_DIR}`}`)
  console.log(`Target: Directus ${BASE}`)
  const login = (await directus('POST', '/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  })) as {
    data: { access_token: string }
  }
  token = login.data.access_token

  // ── Services ─────────────────────────────────────────────────────────────
  const services = asArray(
    (
      (await loadPayload({
        resource: 'services',
        query: '?depth=0&limit=1000&draft=false',
      })) as Json
    ).docs,
  )
  console.log(`Services: ${services.length}`)
  for (const [i, s] of services.entries()) {
    await upsertBySlug({
      collection: 'services',
      slug: str(s.slug) ?? '',
      data: {
        slug: s.slug,
        title: s.title,
        description: s.description,
        category: s.category,
        duration: s.duration,
        benefits: itemArray(s.benefits),
        features: itemArray(s.features),
        icon_name: s.iconName,
        popular: Boolean(s.popular),
        status: statusOf(s),
        sort: typeof s.order === 'number' ? s.order : i,
      },
    })
  }

  // ── Projects (import cover + testimonial avatar on create) ────────────────
  const projects = asArray(
    (
      (await loadPayload({
        resource: 'projects',
        query: '?depth=0&limit=1000&draft=false',
      })) as Json
    ).docs,
  )
  console.log(`Projects: ${projects.length}`)
  for (const [i, p] of projects.entries()) {
    const t = (p.testimonial as Json) ?? {}
    await upsertBySlug({
      collection: 'projects',
      slug: str(p.slug) ?? '',
      data: {
        slug: p.slug,
        title: p.title,
        client: p.client,
        category: p.category,
        location: p.location,
        area: p.area,
        completion_time: p.completionTime,
        description: p.description,
        achievement: p.achievement,
        tags: itemArray(p.tags),
        testimonial_author: t.author ?? null,
        testimonial_role: t.role ?? null,
        testimonial_content: t.content ?? null,
        testimonial_rating: typeof t.rating === 'number' ? t.rating : null,
        status: statusOf(p),
        sort: typeof p.order === 'number' ? p.order : i,
      },
      onCreate: async () => ({
        image: await importImage(mediaUrl(p.imageUrl) ?? mediaUrl(p.image)),
        testimonial_avatar: await importImage(mediaUrl(t.avatarUrl) ?? mediaUrl(t.avatar)),
      }),
    })
  }

  // ── Testimonials (import avatar on create) ────────────────────────────────
  const testimonials = asArray(
    (
      (await loadPayload({
        resource: 'testimonials',
        query: '?depth=0&limit=1000&draft=false',
      })) as Json
    ).docs,
  )
  console.log(`Testimonials: ${testimonials.length}`)
  for (const [i, t] of testimonials.entries()) {
    await upsertBySlug({
      collection: 'testimonials',
      slug: str(t.slug) ?? '',
      data: {
        slug: t.slug,
        author: t.author,
        role: t.role,
        company: t.company,
        content: t.content,
        rating: typeof t.rating === 'number' ? t.rating : 0,
        category: t.category,
        status: statusOf(t),
        sort: typeof t.order === 'number' ? t.order : i,
      },
      onCreate: async () => ({
        avatar: await importImage(mediaUrl(t.avatarUrl) ?? mediaUrl(t.avatar)),
      }),
    })
  }

  // ── site_settings singleton (export the global at depth>=1) ───────────────
  const g = (await loadPayload({ resource: 'globals/site-settings', query: '?depth=2' })) as Json
  console.log('Site settings: mapping global…')
  const company = (g.company as Json) ?? {}
  const social = (g.social as Json) ?? {}
  const branding = (g.branding as Json) ?? {}
  const navigation = (g.navigation as Json) ?? {}
  const typography = (g.typography as Json) ?? {}
  const hero = (g.hero as Json) ?? {}
  const intro = (g.introduction as Json) ?? {}
  const servicesSection = (g.servicesSection as Json) ?? {}
  const projectsSection = (g.projectsSection as Json) ?? {}
  const testimonialsSection = (g.testimonialsSection as Json) ?? {}
  const footer = (g.footer as Json) ?? {}
  const seo = (g.seo as Json) ?? {}
  const heroPrimary = (hero.primaryCta as Json) ?? {}
  const heroSecondary = (hero.secondaryCta as Json) ?? {}

  await directus('PATCH', '/items/site_settings', {
    company_name: company.name,
    company_short_name: company.shortName,
    company_founded: company.founded,
    company_phone: company.phone,
    company_email: company.email,
    company_address: company.address,
    company_branch: company.branch,
    company_motto: company.motto,
    company_certification: company.certification,
    social_facebook: social.facebook,
    social_zalo: social.zalo,
    social_messenger: social.messenger,
    branding_logo_text_primary: branding.logoTextPrimary,
    branding_logo_text_secondary: branding.logoTextSecondary,
    branding_header_tagline: branding.headerTagline,
    branding_footer_tagline: branding.footerTagline,
    navigation_header_cta_label: navigation.headerCtaLabel,
    navigation_mobile_cta_label: navigation.mobileCtaLabel,
    typography_heading_font: typography.headingFont,
    typography_hero_display_font: typography.heroDisplayFont,
    typography_body_font: typography.bodyFont,
    hero_background_image: await importImage(mediaUrl(hero.backgroundImage)),
    hero_trust_badge: hero.trustBadge,
    hero_subheadline: hero.subheadline,
    hero_benefits: itemArray(hero.benefits),
    hero_primary_cta_label: heroPrimary.label,
    hero_primary_cta_href: heroPrimary.href,
    hero_secondary_cta_label: heroSecondary.label,
    hero_secondary_cta_href: heroSecondary.href,
    hero_trust_strap: hero.trustStrap,
    introduction_eyebrow: intro.eyebrow,
    introduction_heading: intro.heading,
    introduction_narrative: intro.narrative,
    introduction_image: await importImage(mediaUrl(intro.image)),
    introduction_motto_eyebrow: intro.mottoEyebrow,
    introduction_brand_story_heading: intro.brandStoryHeading,
    introduction_brand_story_intro: intro.brandStoryIntro,
    introduction_process_eyebrow: intro.processEyebrow,
    introduction_process_heading: intro.processHeading,
    introduction_process_intro: intro.processIntro,
    services_section_eyebrow: servicesSection.eyebrow,
    services_section_heading: servicesSection.heading,
    services_section_description: servicesSection.description,
    projects_section_eyebrow: projectsSection.eyebrow,
    projects_section_heading: projectsSection.heading,
    projects_section_description: projectsSection.description,
    testimonials_section_eyebrow: testimonialsSection.eyebrow,
    testimonials_section_heading: testimonialsSection.heading,
    testimonials_section_description: testimonialsSection.description,
    footer_brand_description: footer.brandDescription,
    footer_quick_links_heading: footer.quickLinksHeading,
    footer_offices_heading: footer.officesHeading,
    footer_headquarters_label: footer.headquartersLabel,
    footer_branch_label: footer.branchLabel,
    footer_support_heading: footer.supportHeading,
    footer_hotline_prefix: footer.hotlinePrefix,
    footer_email_prefix: footer.emailPrefix,
    footer_copyright_suffix: footer.copyrightSuffix,
    footer_back_to_top_label: footer.backToTopLabel,
    seo_meta_title: seo.metaTitle,
    seo_meta_description: seo.metaDescription,
    seo_og_image: await importImage(mediaUrl(seo.ogImage)),
  })
  const settings = (await directus('GET', '/items/site_settings?fields=id')) as {
    data: { id: number }
  }
  const settingsId = settings.data.id

  console.log('Site settings children…')
  await resetChildren({
    collection: 'site_nav_items',
    settingsId,
    rows: asArray(navigation.items).map((n) => ({ label: n.label, section_id: n.sectionId })),
  })
  await resetChildren({
    collection: 'site_footer_links',
    settingsId,
    rows: asArray(footer.quickLinks).map((n) => ({ label: n.label, section_id: n.sectionId })),
  })
  await resetChildren({
    collection: 'site_hero_segments',
    settingsId,
    rows: asArray(hero.headlineSegments).map((h) => ({
      text: h.text,
      color: h.color,
      italic: Boolean(h.italic),
      new_line_before: Boolean(h.newLineBefore),
    })),
  })
  await resetChildren({
    collection: 'site_stats',
    settingsId,
    rows: asArray(g.stats).map((st) => ({ value: st.value, label: st.label, color: st.color })),
  })
  await resetChildren({
    collection: 'site_brand_values',
    settingsId,
    rows: asArray(intro.brandValues).map((b) => ({
      title: b.title,
      description: b.description,
      icon: b.icon,
      accent: b.accent,
    })),
  })
  await resetChildren({
    collection: 'site_process_steps',
    settingsId,
    rows: asArray(intro.processSteps).map((p) => ({
      num: p.num,
      title: p.title,
      description: p.description,
    })),
  })

  // ── Leads (optional, PII) ──────────────────────────────────────────────────
  if (MIGRATE_LEADS) {
    const leads = asArray(
      (
        (await loadPayload({
          resource: 'contact-submissions',
          query: '?depth=0&limit=10000',
        })) as Json
      ).docs,
    )
    console.log(`Leads: ${leads.length}`)
    // No slug — clear and re-insert (one-time migration).
    const existing = (await directus('GET', '/items/contact_submissions?fields=id&limit=-1')) as {
      data: { id: number }[]
    }
    if (existing.data.length > 0)
      await directus(
        'DELETE',
        '/items/contact_submissions',
        existing.data.map((r) => r.id),
      )
    for (const l of leads) {
      await directus('POST', '/items/contact_submissions', {
        full_name: l.fullName,
        email: l.email ?? null,
        phone: l.phone,
        service_category: l.serviceCategory,
        service_id: l.serviceId ?? null,
        company_name: l.companyName ?? null,
        address: l.address ?? null,
        message: l.message ?? null,
        status: l.status ?? 'new',
      })
    }
  }

  console.log('\nMigration complete.')
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('\nMigration failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
