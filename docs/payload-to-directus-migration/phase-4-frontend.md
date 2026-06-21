# Phase 4 — Rewrite `apps/web` for Directus + add the Visual Editor

> ⚠️ **BEFORE YOU WRITE ANY CODE, READ AND OBEY:**
> - [`.claude/frontend-code-style.md`](../../.claude/frontend-code-style.md) — **No `any`. Enums not string-unions. Named handlers (no logic in JSX). No props-drilling (use Context if 3+ levels). Object params. `async/await`. `safeJSONParse`. Use `api`/SDK, not raw `fetch`.**
> - [`.claude/backend-code-style.md`](../../.claude/backend-code-style.md)
> - [`AGENTS.md`](../../AGENTS.md) — **Use Bun. Discourage `useEffect`. Read `node_modules/next/dist/docs/` before writing Next code — this Next.js differs from your training data.**
>
> Phase 3 must be DONE (content seeded, static token issued). This is the largest phase — do the sub-steps in order.

## Goal of this phase

1. Add the Directus SDK and a typed client to `apps/web`.
2. Rewrite [`apps/web/src/data.ts`](../../apps/web/src/data.ts) to fetch from Directus (replacing the Payload REST `fetch`).
3. Resolve media via `/assets/<file-id>` (drop the old mirrored-URL strings).
4. Add the **Visual Editor** (`@directus/visual-editing`) so editors can click elements on the live page to edit them.
5. Adapt the **draft preview** route to Directus content versioning.

## Step 0 — Understand the current frontend (read before editing)

Read these so you know what you are changing:
- [`apps/web/src/data.ts`](../../apps/web/src/data.ts) — current Payload fetchers (`fetchJson`, `fetchCollection`), the `Payload*` interfaces, and the mapping functions that produce the domain types `Service`/`Project`/`Testimonial`/`SiteSettings`.
- [`apps/web/src/app/page.tsx`](../../apps/web/src/app/page.tsx) — the single-page composition; reads `draftMode().isEnabled`, passes data into section components, conditionally renders the live-preview component.
- [`apps/web/src/types.ts`](../../apps/web/src/types.ts) — the **domain types** the components consume. **Keep these stable** — only the data-source mapping changes.
- [`apps/web/src/app/api/preview/route.ts`](../../apps/web/src/app/api/preview/route.ts) and [`apps/web/src/app/api/exit-preview/route.ts`](../../apps/web/src/app/api/exit-preview/route.ts).
- [`apps/web/src/components/live-preview/refresh-route-on-save.tsx`](../../apps/web/src/components/live-preview/refresh-route-on-save.tsx) — the Payload-specific refresher (will be replaced).
- The section components: [`hero/hero.tsx`](../../apps/web/src/components/hero/hero.tsx), [`services/services.tsx`](../../apps/web/src/components/services/services.tsx), [`projects/projects.tsx`](../../apps/web/src/components/projects/projects.tsx), [`testimonials/testimonials.tsx`](../../apps/web/src/components/testimonials/testimonials.tsx), [`introduction/introduction.tsx`](../../apps/web/src/components/introduction/introduction.tsx), [`header/header.tsx`](../../apps/web/src/components/header/header.tsx), [`footer/footer.tsx`](../../apps/web/src/components/footer/footer.tsx).

## Step 1 — Install dependencies (Bun)

```bash
cd apps/web
bun add @directus/sdk @directus/visual-editing
```

Commit the updated `bun.lock`.

## Step 2 — Create the typed Directus client

Create `apps/web/src/lib/directus.ts`. Define the **`Schema`** type (mirror the Phase 2 collections) and export a configured client. **No `any`.**

```ts
// apps/web/src/lib/directus.ts
import { createDirectus, rest, staticToken, readItems, readSingleton, withToken } from '@directus/sdk'
import { Category, ContentStatus } from '@/constants/cms' // enums — see style guide "Use Enums"

// ---- Schema (mirror Phase 2). One interface per collection. NO `any`. ----
export interface DirectusFile {
  id: string
  filename_download: string
}
export interface DirectusService {
  id: string
  slug: string
  title: string
  description: string
  category: Category
  duration: string
  icon_name: string
  popular: boolean
  benefits: string[]
  features: string[]
  status: ContentStatus
  sort: number | null
}
// ...DirectusProject, DirectusTestimonial, DirectusSiteSettings (flat fields + child arrays)

export interface Schema {
  services: DirectusService[]
  projects: DirectusProject[]
  testimonials: DirectusTestimonial[]
  site_settings: DirectusSiteSettings // singleton
}

const DIRECTUS_URL = process.env.NEXT_PUBLIC_CMS_URL ?? 'http://localhost:8055'

// Server-only token. NEVER expose to the browser (no NEXT_PUBLIC_ prefix).
const STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN ?? ''

export const directus = createDirectus<Schema>(DIRECTUS_URL)
  .with(rest())
  .with(staticToken(STATIC_TOKEN))

export { readItems, readSingleton, withToken }
export const DIRECTUS_PUBLIC_URL = DIRECTUS_URL
```

Create `apps/web/src/constants/cms.ts` with the enums (per the style guide, never inline string unions):

```ts
// apps/web/src/constants/cms.ts
export enum Category {
  CLEANING = 'cleaning',
  CONSTRUCTION = 'construction',
  BOTH = 'both',
}
export enum ContentStatus {
  PUBLISHED = 'published',
  DRAFT = 'draft',
}
```

## Step 3 — Add an asset-URL helper

Create `apps/web/src/lib/asset-url/asset-url.ts` (per the style guide: one folder per utility, with a colocated test).

```ts
// apps/web/src/lib/asset-url/asset-url.ts
import { DIRECTUS_PUBLIC_URL } from '@/lib/directus'

// Build a public asset URL from a Directus file id. Returns null when there is no file.
export const assetUrl = ({ fileId }: { fileId: string | null | undefined }): string | null => {
  if (!fileId) return null
  return `${DIRECTUS_PUBLIC_URL}/assets/${fileId}`
}
```

Add `apps/web/src/lib/asset-url/asset-url.test.ts` covering: a valid id, `null`, and `undefined`.

## Step 4 — Rewrite `data.ts` to use the SDK

Rewrite [`apps/web/src/data.ts`](../../apps/web/src/data.ts):

- **Delete** `fetchJson`, `fetchCollection`, and the Payload-specific URL/auth logic.
- **Rename** the internal `Payload*` interfaces to the `Directus*` interfaces (now imported from `@/lib/directus`).
- **Keep** the public domain types and the mapping functions' *output* shape identical, so the components don't change shape. Only the input source changes.
- Fetch with the SDK:

```ts
// fetch published services, ordered by sort
const services = await directus.request(
  readItems('services', {
    sort: ['sort'],
    limit: -1,
    fields: ['*'], // or an explicit field list
  }),
)

// singleton + its O2M children (expand the relations you need)
const settings = await directus.request(
  readSingleton('site_settings', {
    fields: [
      '*',
      'nav_items.*',
      'footer_quick_links.*',
      'hero_headline_segments.*',
      'stats.*',
      'brand_values.*',
      'process_steps.*',
    ],
  }),
)
```

- **Media mapping:** wherever the old code read `imageUrl` / `avatarUrl` strings, instead read the file id field (`image`, `avatar`, `og_image`, `hero_background_image`, `introduction_image`, `seo_og_image`, `testimonial_avatar`) and run it through `assetUrl({ fileId })`. The domain type still exposes a `string | null` URL — the source is now derived, not stored.
- **Re-nest flat singleton fields** into the nested `SiteSettings` domain shape the components expect (e.g. `company_name` → `company.name`). Keep this mapping in one place in `data.ts`.
- **Caching / preview:** keep the same intent as today.
  - Published reads: ISR (`next: { revalidate: 300 }` equivalent — pass via the SDK request options or wrap the fetch). Match whatever revalidate value the old code used.
  - Preview/draft reads: when `isPreviewMode` is true, read the **draft** content version and disable caching. Use the `version` query and the editor token:
    ```ts
    // draft read in preview mode
    const draft = await directus.request(
      withToken(editorToken, readItems('services', { version: 'draft', limit: -1, sort: ['sort'] })),
    )
    ```
  - Thread an `isPreviewMode` boolean into the fetchers exactly like the old code did. The editor token in preview comes from the Studio session (the Visual Editor injects it); see Step 7.

> Per the style guide, wrap every fetch/parse in `try/catch` with a sensible fallback (the old code had an 8s timeout + fail-fast — preserve that resilience so a CMS outage doesn't crash the page).

## Step 5 — Thread the Directus `id` of each record into the components

The Visual Editor needs the `collection`, the **item id**, and the **field name** for each editable element. Today the components only receive display values. You must pass the `id` too.

- In `data.ts` mapping, **keep the `id`** on each domain object (`Service.id`, `Project.id`, `Testimonial.id`, and the `site_settings` singleton id — it's `1`/the singleton id, and each child row's id).
- Update the domain types in [`apps/web/src/types.ts`](../../apps/web/src/types.ts) to include `id: string` where missing.
- In [`page.tsx`](../../apps/web/src/app/page.tsx), pass the ids down into the section components (they already receive the data; just make sure `id` is included).

## Step 6 — Create the Visual Editor helper

Create `apps/web/src/lib/visual-editor/visual-editor.ts`:

```ts
// apps/web/src/lib/visual-editor/visual-editor.ts
import { apply, setAttr, remove } from '@directus/visual-editing'

let isApplied = false

// Initialize the in-context Visual Editor overlay. Safe to call more than once.
export const initializeVisualEditor = async ({
  directusUrl,
  onSaved,
}: {
  directusUrl: string
  onSaved: () => void
}): Promise<void> => {
  if (typeof window === 'undefined' || isApplied) return
  try {
    await apply({ directusUrl, onSaved: () => onSaved() })
    isApplied = true
  } catch (error: unknown) {
    console.error('Failed to initialize Directus Visual Editor:', error)
  }
}

export const cleanupVisualEditor = (): void => {
  if (typeof window === 'undefined' || !isApplied) return
  remove()
  isApplied = false
}

export { setAttr }
```

## Step 7 — Replace the Payload refresher with a Visual Editor initializer

Delete [`apps/web/src/components/live-preview/refresh-route-on-save.tsx`](../../apps/web/src/components/live-preview/refresh-route-on-save.tsx) and create `apps/web/src/components/live-preview/visual-editor-init.tsx`.

> **AGENTS.md says discourage `useEffect`.** The Visual Editor must initialize once on the client after mount. Prefer a **callback-ref** that runs the init exactly once, instead of `useEffect`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { initializeVisualEditor } from '@/lib/visual-editor/visual-editor'
import { DIRECTUS_PUBLIC_URL } from '@/lib/directus'

// Mounts an invisible node; its ref callback initializes the Visual Editor once on the client.
// Rendered ONLY in preview/draft mode (see page.tsx).
export function VisualEditorInit() {
  const router = useRouter()

  // Ref callback fires after the node is attached to the DOM (client-only), once.
  const initRef = useCallback(
    (node: HTMLSpanElement | null) => {
      if (!node) return
      void initializeVisualEditor({
        directusUrl: DIRECTUS_PUBLIC_URL,
        onSaved: () => router.refresh(), // re-run server components to show the saved change
      })
    },
    [router],
  )

  return <span ref={initRef} hidden aria-hidden data-visual-editor-init />
}
```

> If the `@directus/visual-editing` `apply()` lifecycle genuinely requires `useEffect` (e.g. it needs a cleanup on unmount tied to React's lifecycle), then isolate it in this single component, add `cleanupVisualEditor` in the effect's cleanup, and add a short comment explaining why the exception to the no-`useEffect` rule is necessary here. Do not spread `useEffect` anywhere else.

In [`page.tsx`](../../apps/web/src/app/page.tsx): keep the existing `draftMode().isEnabled` check and render `<VisualEditorInit />` (instead of the old `<RefreshRouteOnSave />`) only when preview mode is on.

## Step 8 — Add `data-directus` attributes to editable elements

In each section component, import `setAttr` from the visual-editor helper and add a `data-directus` attribute to the elements that map to a CMS field. The pattern:

```tsx
import { setAttr } from '@/lib/visual-editor/visual-editor'

// In JSX, on the element rendering `service.title`:
<h3 data-directus={setAttr({ collection: 'services', item: service.id, fields: 'title', mode: 'popover' })}>
  {service.title}
</h3>
```

- `collection`: the Directus collection name (`services`, `projects`, `testimonials`, `site_settings`, or a child like `site_hero_segments`).
- `item`: the record id you threaded through in Step 5.
- `fields`: the field name (or array of field names) to edit.
- `mode`: `'popover'` for short text, `'drawer'` for a record with many fields, `'modal'` for files/large content.

Add attributes across:
- **hero.tsx** — headline segments (`site_hero_segments` items), subheadline, CTAs, trust badge/strap, background image (all on `site_settings` or the segment children).
- **services.tsx** — each service card's title/description/category/etc. (`services`, `item: service.id`).
- **projects.tsx** — each project's fields and its flattened testimonial fields (`projects`, `item: project.id`).
- **testimonials.tsx** — each testimonial (`testimonials`, `item: testimonial.id`).
- **introduction.tsx** — narrative/headings (`site_settings`), brand values (`site_brand_values` children), process steps (`site_process_steps` children).
- **header.tsx** — branding + nav items (`site_nav_items` children) + CTA labels.
- **footer.tsx** — footer copy + quick links (`site_footer_links` children) + social.

> These attributes are harmless in normal (non-preview) browsing — they're just data attributes. They only "light up" when the page is loaded inside the Directus Visual Editor.

## Step 9 — Adapt the preview route

Keep [`apps/web/src/app/api/preview/route.ts`](../../apps/web/src/app/api/preview/route.ts):
- Validate a shared secret from the query against `process.env.DIRECTUS_PREVIEW_SECRET`.
- Call `draftMode().enable()`.
- Redirect to a **same-site relative** path only (keep the existing safe-redirect guard).

Keep [`exit-preview/route.ts`](../../apps/web/src/app/api/exit-preview/route.ts) as-is (disable draft mode, redirect home).

In Directus, configure the preview URL: **Studio → Settings → Visual Editor** → add the site origin (`http://localhost:3000` dev / `https://${SITE_DOMAIN}` prod) to the allowed/sample URLs, pointing at your preview entrypoint.

## Step 10 — Allow the Studio to iframe the site (CSP)

The Visual Editor embeds the public site in an iframe inside the Studio. The site must permit being framed by the CMS origin.

- In `apps/web`, set a `Content-Security-Policy` `frame-ancestors` header allowing the CMS origin. Read `node_modules/next/dist/docs/` for the current way to set headers (config `headers()` vs middleware) in this Next.js version, then add:
  - `frame-ancestors 'self' https://<CMS_DOMAIN>` (dev: `http://localhost:8055`).
- This must match the `CONTENT_SECURITY_POLICY_DIRECTIVES__FRAME_ANCESTORS` you set on the Directus container in Phase 1.

## Step 11 — Update env usage

- `NEXT_PUBLIC_CMS_URL` → Directus origin (used by the SDK client and `assetUrl`).
- `DIRECTUS_STATIC_TOKEN` (server-only) → from Phase 3.
- `DIRECTUS_PREVIEW_SECRET` (server-only) → used by the preview route; set the same value in the Directus Visual Editor preview URL.
- Remove any remaining `CMS_PREVIEW_API_KEY` / `PAYLOAD_PREVIEW_SECRET` references in `apps/web`.

## Step 12 — Run and verify end-to-end (local)

```bash
turbo run dev    # per CLAUDE.md, start dev servers with turbo
```

Verify each:
- [ ] `http://localhost:3000` renders all sections from Directus content (hero, services, projects, testimonials, intro, footer).
- [ ] Images load via `http://localhost:8055/assets/<id>` (check the Network tab).
- [ ] Set a service to `draft` in the Studio → it disappears from the public site; in preview mode it reappears.
- [ ] Open the page from **Studio → Visual Editor**: editable elements show edit overlays; editing a hero headline / service title and saving triggers `router.refresh()` and the change appears without a manual reload. No CSP/iframe error in the console.
- [ ] Submit the contact form on the site → a `contact_submissions` row is created (public create works), with `status = new`.

## Definition of Done (all must pass before Phase 5)

- [ ] `@directus/sdk` + `@directus/visual-editing` installed; `bun.lock` committed.
- [ ] `apps/web/src/lib/directus.ts` (typed client, no `any`), `constants/cms.ts` (enums), and the `assetUrl` utility (with test) exist.
- [ ] `data.ts` fetches from Directus via the SDK, resolves media via `/assets/<id>`, re-nests singleton fields, and preserves the domain types in `types.ts`.
- [ ] Record `id`s are threaded into the components.
- [ ] `VisualEditorInit` replaces `RefreshRouteOnSave`; `data-directus` attributes added across all section components.
- [ ] Preview route validates `DIRECTUS_PREVIEW_SECRET` and toggles draft mode; CSP `frame-ancestors` allows the CMS origin.
- [ ] All Step 12 checks pass.

When all boxes are checked, go to [`phase-5-cleanup-and-docs.md`](./phase-5-cleanup-and-docs.md).
