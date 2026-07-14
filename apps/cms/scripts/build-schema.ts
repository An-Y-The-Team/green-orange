/**
 * Builds the Directus data model for the Green-Orange portfolio CMS by driving
 * the management API (collections / fields / relations). This is the automation
 * equivalent of clicking through Settings → Data Model in the Studio.
 *
 * The committed source of truth is `apps/cms/snapshots/snapshot.yaml`, produced
 * by `directus schema snapshot` AFTER this script runs. Re-run safely: every
 * create is tolerant of "already exists".
 *
 * Run (Bun, per AGENTS.md):
 *   DIRECTUS_PUBLIC_URL=http://localhost:8055 \
 *   DIRECTUS_ADMIN_EMAIL=admin@example.com \
 *   DIRECTUS_ADMIN_PASSWORD=admin \
 *   bun apps/cms/scripts/build-schema.ts
 */

const BASE = process.env.DIRECTUS_PUBLIC_URL ?? 'http://localhost:8055'
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL ?? 'admin@example.com'
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD ?? 'admin'

let token = ''

interface DirectusError {
  message?: string
  extensions?: { code?: string }
}

const api = async (method: string, path: string, body?: unknown): Promise<unknown> => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) {
    let code = ''
    let message = text
    try {
      const parsed = JSON.parse(text) as { errors?: DirectusError[] }
      const first = parsed.errors?.[0]
      code = first?.extensions?.code ?? ''
      message = first?.message ?? text
    } catch {
      // non-JSON error body — keep raw text
    }
    const err = new Error(`${method} ${path} -> ${res.status} ${code}: ${message}`)
    ;(err as Error & { code?: string }).code = code
    throw err
  }
  return text ? JSON.parse(text) : null
}

// Swallow "already exists" so the script is idempotent; rethrow anything else.
const tolerant = async (fn: () => Promise<unknown>, label: string): Promise<void> => {
  try {
    await fn()
    console.log(`  ✓ ${label}`)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    const code = (error as Error & { code?: string }).code ?? ''
    const exists =
      code === 'RECORD_NOT_UNIQUE' ||
      /already exists|has to be unique|duplicate|already has an associated/i.test(message)
    if (exists) {
      console.log(`  • ${label} (already exists, skipped)`)
      return
    }
    throw error
  }
}

// ─── Field-definition helpers ────────────────────────────────────────────────
type FieldDef = Record<string, unknown>

const choices = (values: string[]): { text: string; value: string }[] =>
  values.map((v) => ({ text: v, value: v }))

const str = (
  field: string,
  opts: { required?: boolean; unique?: boolean; multiline?: boolean } = {},
): FieldDef => ({
  field,
  type: opts.multiline ? 'text' : 'string',
  meta: {
    interface: opts.multiline ? 'input-multiline' : 'input',
    required: Boolean(opts.required),
  },
  schema: { is_nullable: !opts.required, is_unique: Boolean(opts.unique) },
})

const dropdown = (
  field: string,
  values: string[],
  opts: { required?: boolean; defaultValue?: string | null } = {},
): FieldDef => ({
  field,
  type: 'string',
  meta: {
    interface: 'select-dropdown',
    options: { choices: choices(values) },
    display: 'labels',
    required: Boolean(opts.required),
  },
  schema: { is_nullable: !opts.required, default_value: opts.defaultValue ?? null },
})

const bool = (field: string, defaultValue = false): FieldDef => ({
  field,
  type: 'boolean',
  meta: { interface: 'boolean' },
  schema: { default_value: defaultValue },
})

const int = (field: string, opts: { required?: boolean } = {}): FieldDef => ({
  field,
  type: 'integer',
  meta: { interface: 'input', required: Boolean(opts.required) },
  schema: { is_nullable: !opts.required },
})

// Simple list of strings (e.g. benefits/features/tags) — stored as a JSON array.
const tags = (field: string): FieldDef => ({
  field,
  type: 'json',
  meta: { interface: 'tags' },
  schema: {},
})

const statusField = (values: string[], defaultValue: string): FieldDef => ({
  field: 'status',
  type: 'string',
  meta: { interface: 'select-dropdown', options: { choices: choices(values) }, display: 'labels' },
  schema: { default_value: defaultValue, is_nullable: false },
})

const SORT: FieldDef = {
  field: 'sort',
  type: 'integer',
  meta: { interface: 'input', hidden: true },
  schema: {},
}

// ─── API wrappers ────────────────────────────────────────────────────────────
const createCollection = async (
  collection: string,
  meta: Record<string, unknown> = {},
): Promise<void> =>
  tolerant(
    () =>
      api('POST', '/collections', {
        collection,
        schema: {},
        meta,
        fields: [
          {
            field: 'id',
            type: 'integer',
            meta: { hidden: true },
            schema: { is_primary_key: true, has_auto_increment: true },
          },
        ],
      }),
    `collection ${collection}`,
  )

const addField = async (collection: string, def: FieldDef): Promise<void> =>
  tolerant(() => api('POST', `/fields/${collection}`, def), `${collection}.${def.field as string}`)

const addFields = async (collection: string, defs: FieldDef[]): Promise<void> => {
  for (const def of defs) await addField(collection, def)
}

// Patch an existing field's meta (interface, options, etc.) — safe to re-run.
const patchField = async (
  collection: string,
  field: string,
  meta: Record<string, unknown>,
): Promise<void> =>
  tolerant(
    () => api('PATCH', `/fields/${collection}/${field}`, { meta }),
    `patch ${collection}.${field}`,
  )

// File (uuid → directus_files M2O).
const addFileField = async (
  collection: string,
  field: string,
  opts: { image?: boolean; required?: boolean } = {},
): Promise<void> => {
  const image = opts.image ?? true
  await addField(collection, {
    field,
    type: 'uuid',
    meta: {
      interface: image ? 'file-image' : 'file',
      special: ['file'],
      required: Boolean(opts.required),
    },
    schema: {},
  })
  await tolerant(
    () => api('POST', '/relations', { collection, field, related_collection: 'directus_files' }),
    `relation ${collection}.${field} → directus_files`,
  )
}

// One-to-many: child collection + FK back to parent + alias field on the parent.
const addO2M = async (
  parent: string,
  child: string,
  alias: string,
  childFields: FieldDef[],
): Promise<void> => {
  await createCollection(child, { sort_field: 'sort' })
  await addField(child, SORT)
  await addFields(child, childFields)
  await addField(child, {
    field: parent,
    type: 'integer',
    meta: { interface: 'select-dropdown-m2o', hidden: true },
    schema: {},
  })
  await addField(parent, {
    field: alias,
    type: 'alias',
    meta: { interface: 'list-o2m', special: ['o2m'] },
  })
  await tolerant(
    () =>
      api('POST', '/relations', {
        collection: child,
        field: parent,
        related_collection: parent,
        meta: { one_field: alias, sort_field: 'sort', one_deselect_action: 'delete' },
      }),
    `relation ${child}.${parent} → ${parent} (o2m ${alias})`,
  )
}

const CLEAN_CON = ['cleaning', 'construction']
const CLEAN_CON_BOTH = ['cleaning', 'construction', 'both']
const SECTION_IDS = ['hero', 'introduction', 'services', 'projects', 'testimonials', 'contact']

const main = async (): Promise<void> => {
  console.log(`Logging in to ${BASE} as ${ADMIN_EMAIL}…`)
  const login = (await api('POST', '/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  })) as { data: { access_token: string } }
  token = login.data.access_token

  // ── services ───────────────────────────────────────────────────────────────
  console.log('services')
  await createCollection('services', {
    sort_field: 'sort',
    versioning: true,
    icon: 'home_repair_service',
  })
  await addFields('services', [
    str('slug', { required: true, unique: true }),
    str('title', { required: true }),
    str('description', { required: true, multiline: true }),
    dropdown('category', CLEAN_CON, { required: true }),
    str('duration', { required: true }),
    str('icon_name', { required: true }),
    bool('popular', false),
    tags('benefits'),
    tags('features'),
    str('meta_title'),
    str('meta_description', { multiline: true }),
  ])
  await addFileField('services', 'og_image')
  await addField('services', SORT)
  await addField('services', statusField(['published', 'draft'], 'draft'))

  // ── projects ─────────────────────────────────────────────────────────────────
  console.log('projects')
  await createCollection('projects', {
    sort_field: 'sort',
    versioning: true,
    icon: 'photo_library',
  })
  await addFields('projects', [
    str('slug', { required: true, unique: true }),
    str('title', { required: true }),
    str('client', { required: true }),
    dropdown('category', CLEAN_CON, { required: true }),
    str('location', { required: true }),
    str('area', { required: true }),
    str('completion_time', { required: true }),
    str('description', { required: true, multiline: true }),
    str('achievement', { required: true, multiline: true }),
  ])
  await addFileField('projects', 'image', { required: true })
  await addFields('projects', [
    tags('tags'),
    str('testimonial_author'),
    str('testimonial_role'),
    str('testimonial_content', { multiline: true }),
    int('testimonial_rating'),
  ])
  await addFileField('projects', 'testimonial_avatar')
  await addFields('projects', [str('meta_title'), str('meta_description', { multiline: true })])
  await addFileField('projects', 'og_image')
  await addField('projects', SORT)
  await addField('projects', statusField(['published', 'draft'], 'draft'))

  // ── testimonials ─────────────────────────────────────────────────────────────
  console.log('testimonials')
  await createCollection('testimonials', {
    sort_field: 'sort',
    versioning: true,
    icon: 'format_quote',
  })
  await addFields('testimonials', [
    str('slug', { required: true, unique: true }),
    str('author', { required: true }),
    str('role', { required: true }),
    str('company', { required: true }),
    str('content', { required: true, multiline: true }),
    int('rating', { required: true }),
  ])
  await addFileField('testimonials', 'avatar')
  await addField('testimonials', dropdown('category', CLEAN_CON_BOTH, { required: true }))
  await addField('testimonials', SORT)
  await addField('testimonials', statusField(['published', 'draft'], 'draft'))

  // ── contact_submissions (public create; no versioning) ───────────────────────
  console.log('contact_submissions')
  await createCollection('contact_submissions', { icon: 'inbox' })
  await addFields('contact_submissions', [
    str('full_name', { required: true }),
    str('email'),
    str('phone', { required: true }),
    dropdown('service_category', CLEAN_CON_BOTH, { required: true }),
    str('service_id'),
    str('company_name'),
    str('address'),
    str('message', { multiline: true }),
    statusField(['new', 'processing', 'contacted'], 'new'),
  ])

  // ── site_settings (singleton) ────────────────────────────────────────────────
  console.log('site_settings')
  await createCollection('site_settings', { singleton: true, icon: 'settings' })
  await addFields('site_settings', [
    // Company
    str('company_name'),
    str('company_short_name'),
    str('company_founded'),
    str('company_phone'),
    str('company_email'),
    str('company_address', { multiline: true }),
    str('company_branch'),
    str('company_motto'),
    str('company_certification'),
    // Social
    str('social_facebook'),
    str('social_zalo'),
    str('social_messenger'),
    // Branding
    str('branding_logo_text_primary'),
    str('branding_logo_text_secondary'),
    str('branding_header_tagline'),
    str('branding_footer_tagline'),
    // Navigation (scalars)
    str('navigation_header_cta_label'),
    str('navigation_mobile_cta_label'),
    // Typography
    dropdown('typography_heading_font', ['be-vietnam-pro', 'manrope', 'playfair-display', 'lora']),
    dropdown('typography_hero_display_font', ['playfair-display', 'lora', 'dm-serif-display']),
    dropdown('typography_body_font', ['be-vietnam-pro', 'inter', 'lexend', 'nunito-sans', 'lora']),
    // Color theme
    dropdown('color_theme', ['green-orange', 'ocean', 'royal', 'crimson', 'forest']),
  ])
  // Hero scalars
  await addFileField('site_settings', 'hero_background_image')
  await addFields('site_settings', [
    str('hero_trust_badge'),
    str('hero_subheadline', { multiline: true }),
    tags('hero_benefits'),
    str('hero_primary_cta_label'),
    str('hero_primary_cta_href'),
    str('hero_secondary_cta_label'),
    str('hero_secondary_cta_href'),
    str('hero_trust_strap'),
  ])
  // Introduction scalars
  await addFields('site_settings', [
    str('introduction_eyebrow'),
    str('introduction_heading', { multiline: true }),
    str('introduction_narrative', { multiline: true }),
  ])
  await addFileField('site_settings', 'introduction_image')
  await addFields('site_settings', [
    str('introduction_motto_eyebrow'),
    str('introduction_brand_story_heading', { multiline: true }),
    str('introduction_brand_story_intro', { multiline: true }),
    str('introduction_process_eyebrow'),
    str('introduction_process_heading', { multiline: true }),
    str('introduction_process_intro', { multiline: true }),
    // Section copy
    str('services_section_eyebrow'),
    str('services_section_heading', { multiline: true }),
    str('services_section_description', { multiline: true }),
    str('projects_section_eyebrow'),
    str('projects_section_heading', { multiline: true }),
    str('projects_section_description', { multiline: true }),
    str('testimonials_section_eyebrow'),
    str('testimonials_section_heading', { multiline: true }),
    str('testimonials_section_description', { multiline: true }),
    // Footer scalars
    str('footer_brand_description', { multiline: true }),
    str('footer_quick_links_heading'),
    str('footer_offices_heading'),
    str('footer_headquarters_label'),
    str('footer_branch_label'),
    str('footer_support_heading'),
    str('footer_hotline_prefix'),
    str('footer_email_prefix'),
    str('footer_copyright_suffix'),
    str('footer_back_to_top_label'),
    // SEO scalars
    str('seo_meta_title'),
    str('seo_meta_description', { multiline: true }),
  ])
  await addFileField('site_settings', 'seo_og_image')

  // ── site_settings O2M children ───────────────────────────────────────────────
  console.log('site_settings → O2M children')
  await addO2M('site_settings', 'site_nav_items', 'nav_items', [
    str('label'),
    dropdown('section_id', SECTION_IDS),
  ])
  await addO2M('site_settings', 'site_footer_links', 'footer_quick_links', [
    str('label'),
    dropdown('section_id', SECTION_IDS),
  ])
  await addO2M('site_settings', 'site_hero_segments', 'hero_headline_segments', [
    str('text'),
    dropdown('color', ['white', 'emerald', 'orange']),
    bool('italic', false),
    bool('new_line_before', false),
  ])
  await addO2M('site_settings', 'site_stats', 'stats', [str('value'), str('label'), str('color')])
  await addO2M('site_settings', 'site_brand_values', 'brand_values', [
    str('title'),
    str('description', { multiline: true }),
    dropdown('icon', ['Wrench', 'ShieldCheck', 'Trees']),
    dropdown('accent', ['orange', 'slate', 'emerald']),
  ])
  await addO2M('site_settings', 'site_process_steps', 'process_steps', [
    str('num'),
    str('title'),
    str('description', { multiline: true }),
  ])

  // ── Patch existing heading fields to multiline ───────────────────────────────
  // addField skips already-existing fields, so any field created before this
  // change was made with interface=input. Patch them to input-multiline so
  // editors can enter newlines in Directus without re-creating the columns.
  console.log('patching heading fields → input-multiline')
  const MULTILINE_META = { interface: 'input-multiline', special: null }
  for (const field of [
    'introduction_heading',
    'introduction_brand_story_heading',
    'introduction_process_heading',
    'services_section_heading',
    'projects_section_heading',
    'testimonials_section_heading',
  ]) {
    await patchField('site_settings', field, MULTILINE_META)
  }

  console.log('\nDone. Data model built.')
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('\nSchema build failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
