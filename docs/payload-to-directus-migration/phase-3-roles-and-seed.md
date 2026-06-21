# Phase 3 — Roles, permissions, API token, and content seed

> ⚠️ **BEFORE YOU TOUCH ANYTHING, READ AND OBEY:**
> - [`.claude/frontend-code-style.md`](../../.claude/frontend-code-style.md) — the seed script is TypeScript; **no `any`**, use enums, object params, `async/await`, no `return await`.
> - [`.claude/backend-code-style.md`](../../.claude/backend-code-style.md)
> - [`AGENTS.md`](../../AGENTS.md) — **Use Bun / `bunx`, never npm/yarn/pnpm/npx.**
>
> Phase 2 must be DONE (model built + snapshot committed). Do not start Phase 4 until this phase's "Definition of Done" passes.

## Goal of this phase

1. Set up the **access control** that replaces Payload's `src/access/*.ts`:
   - **Public** (unauthenticated) can read only `published` content and create contact submissions.
   - **Editor** role can manage content.
   - **Admin** keeps full access.
2. Create a **read-only static token** for the web app's server-side fetches → `DIRECTUS_STATIC_TOKEN`.
3. **Seed all content** (6 services, 4 projects, 3 testimonials, the `site_settings` singleton + its child rows) with a TypeScript script using `@directus/sdk`, porting the old [`apps/cms/src/seed.ts`](../../apps/cms/src/seed.ts).

> Roles/permissions/tokens are **NOT** in the schema snapshot. They must be configured per-environment. We configure them in the Studio (local now; the operator repeats on prod — see Phase 5).

## Mapping from the old Payload access rules

| Payload rule (old) | Directus equivalent (new) |
|---|---|
| `readPublishedOrAuth` (public sees `published`, auth sees all) | Public policy: read filtered to `status = published`; Editor/Admin: read all |
| `isAuthenticated` (create/update content) | Editor role policy: full CRUD on content collections |
| `isAdmin` (delete, manage users) | Admin role (Directus default Administrator) |
| `isAdminOrSelf` (users see own profile) | Directus system users + roles handle this natively |
| `ContactSubmissions`: public create, staff read, status staff-only | Public policy: `create` on `contact_submissions`; field-level: deny public write to `status` |

## Step 1 — Configure the Public policy (read published only)

In the Studio: **Settings → Access Policies → "Public"** (this policy applies to all unauthenticated requests).

Add these permissions:

1. **`services` — Read**
   - Click **Add Collection → services → Read**.
   - Under **Item Permissions**, add a filter: `status` **Equals** `published`.
   - Under **Field Permissions**, allow **all fields** (the public site needs them).
2. **`projects` — Read** — same: filter `status = published`, all fields.
3. **`testimonials` — Read** — same: filter `status = published`, all fields.
4. **`site_settings` — Read** — all fields (no status filter; it's a singleton).
5. **All six `site_*` child collections — Read** — all fields (so nested O2M data resolves for the public).
6. **`directus_files` — Read** — all fields. (Required so `/assets/<id>` works for the public site.)
7. **`contact_submissions` — Create**
   - Add **Create** permission.
   - **Field Permissions:** allow `full_name`, `email`, `phone`, `service_category`, `service_id`, `company_name`, `address`, `message`.
   - **Do NOT allow `status`** (so the public cannot set it; it defaults to `new`).
   - Do **not** grant Read/Update/Delete to the public on this collection.

> Test the filter immediately: open an incognito tab → `http://localhost:8055/items/services` should return **only published** items (empty for now, since no content yet — that's fine; we verify again after seeding).

## Step 2 — Create the Editor role

**Settings → Roles → Create Role** → name `Editor`.

Attach a policy (or add permissions directly) granting:
- `services`, `projects`, `testimonials`: **Create, Read, Update** (Read = all items, including drafts). Leave **Delete** to Admin only if you want to mirror Payload (Payload restricted delete to admins).
- `site_settings` and all `site_*` child collections: **Read, Update** (and Create/Delete on the child collections so editors can add/remove repeater rows).
- `contact_submissions`: **Read, Update** (to manage leads), not Delete.
- `directus_files`: **Create, Read, Update** (to upload media).

> Admin is Directus's built-in **Administrator** role — leave it as-is. That's the `isAdmin` equivalent.

## Step 3 — Create the web app's read-only static token

The web app does server-side reads of **published** content. Give it the **same access as Public** (read published), via a dedicated token. Two options — pick **Option A**:

**Option A (recommended): a service user with the Public-equivalent access.**
1. **Settings → Roles → Create Role** → name `Frontend (read published)`. Attach a policy identical to the Public policy's read permissions (read published `services`/`projects`/`testimonials`, read `site_settings` + children, read `directus_files`). No create/update/delete.
2. **User Directory → Create User** → email `frontend@service.local`, assign the `Frontend (read published)` role.
3. Open that user → **Token** field → **Generate Token** → copy it.
4. Put it in your local `apps/web` env as `DIRECTUS_STATIC_TOKEN=...` and (later) hand it to the operator for prod `.env.production`.

> A static token never expires, which is what we want for a server-to-server read credential. Keep it server-only — never expose it to the browser (it must NOT be a `NEXT_PUBLIC_*` var).

**For preview/draft reads (Phase 4):** the Visual Editor runs in the Studio where the editor is already authenticated, so draft reads in preview mode use the **editor's** session/token, not the static token. You do not need a second token now.

## Step 4 — Write the content seed script

Create [`apps/cms/seed/seed.ts`](../../apps/cms/seed/seed.ts). Port the data from the old [`apps/cms/src/seed.ts`](../../apps/cms/src/seed.ts) (which mirrors `apps/web/src/types.ts`). **Open the old seed file and copy the actual data values** — do not invent content.

Add the SDK as a dev dependency in `apps/cms` (use Bun):

```bash
cd apps/cms && bun add -d @directus/sdk tsx dotenv
```

Follow these rules from the style guide while writing the script:
- **No `any`.** Type the SDK `Schema` and every record.
- **Enums, not string unions** for `category`, `status`, `color`, `icon`, `accent`, `section_id`, fonts — define them in a small `constants.ts` next to the seed and reference them.
- **Object parameters** for helper functions.
- **`async/await`**, never `.then().catch()`, never `return await`.
- Make the script **idempotent**: upsert by `slug` (delete-then-create, or read-by-slug then update/create), exactly like the old seed.

Script skeleton (fill in the real data and field lists):

```ts
// apps/cms/seed/seed.ts
import 'dotenv/config'
import {
  createDirectus,
  rest,
  authentication,
  readItems,
  createItem,
  updateItem,
  updateSingleton,
  uploadFiles,
} from '@directus/sdk'
import { Category, ServiceStatus } from './constants'

// 1. Define the Schema type for the SDK (mirror Phase 2 collections; NO `any`).
interface Service {
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
  status: ServiceStatus
  sort: number
}
// ...Project, Testimonial, SiteSettings, child rows, etc.

interface Schema {
  services: Service[]
  projects: Project[]
  testimonials: Testimonial[]
  site_settings: SiteSettings // singleton
  // child collections...
}

const DIRECTUS_URL = process.env.DIRECTUS_PUBLIC_URL ?? 'http://localhost:8055'

const client = createDirectus<Schema>(DIRECTUS_URL).with(rest()).with(authentication())

// Upsert one service by its unique slug.
const upsertService = async ({ service }: { service: Omit<Service, 'id'> }): Promise<void> => {
  const existing = await client.request(
    readItems('services', { filter: { slug: { _eq: service.slug } }, limit: 1 }),
  )
  if (existing.length > 0) {
    await client.request(updateItem('services', existing[0].id, service))
    return
  }
  await client.request(createItem('services', service))
}

const run = async (): Promise<void> => {
  await client.login({
    email: process.env.DIRECTUS_ADMIN_EMAIL ?? '',
    password: process.env.DIRECTUS_ADMIN_PASSWORD ?? '',
  })

  // SERVICES (copy the 6 from the old seed; set status: ServiceStatus.PUBLISHED, sort: index)
  // for each service: await upsertService({ service })

  // PROJECTS, TESTIMONIALS: same upsert-by-slug pattern.
  // - For images: upload the source asset with uploadFiles(), then set image = <returned file id>.
  //   If the old seed used remote URLs and you prefer not to re-host, you may temporarily keep an
  //   external URL in a text field — BUT the Phase 2 model uses File fields, so prefer uploading.

  // SITE_SETTINGS singleton: await client.request(updateSingleton('site_settings', { ...flatFields }))
  // CHILD ROWS (nav_items, hero_headline_segments, stats, brand_values, process_steps, footer_quick_links):
  //   delete existing rows for the singleton, then create fresh ones with the correct `sort`.
}

run()
  .then(() => {
    console.log('Seed complete')
    process.exit(0)
  })
  .catch((error: unknown) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
```

> **Media note:** Payload's old `media` volume files are not Directus-compatible. Re-upload the source images via `uploadFiles()` in the seed. The dataset is tiny (a handful of project/testimonial images + hero/intro/og images). If the original image files are not in the repo, locate the source assets (check `apps/web/public` or the old seed's URLs) and upload those.

Add convenience scripts to `apps/cms/package.json` (Bun runs them):

```json
{
  "scripts": {
    "seed": "bunx tsx seed/seed.ts",
    "schema:snapshot": "echo 'run inside the directus container: directus schema snapshot'",
    "schema:apply": "echo 'run inside the directus container: directus schema apply'"
  }
}
```

## Step 5 — Run the seed and verify

```bash
cd apps/cms && bun run seed
```

Then verify:
- In the Studio, `services`/`projects`/`testimonials` have the expected rows; `site_settings` is filled and its child collections have rows in the right order.
- Public read respects status:
  ```bash
  # published items only (set at least one service to `published` in the Studio or via the seed):
  curl http://localhost:8055/items/services
  # singleton:
  curl http://localhost:8055/items/site_settings
  # an asset (replace <id> with a real file id from the Studio):
  curl -I http://localhost:8055/assets/<id>
  ```
- With the static token you should get the same published reads:
  ```bash
  curl -H "Authorization: Bearer $DIRECTUS_STATIC_TOKEN" http://localhost:8055/items/services
  ```

## Definition of Done (all must pass before Phase 4)

- [ ] Public policy: reads only `published` `services`/`projects`/`testimonials`, reads `site_settings` + all `site_*` children + `directus_files`, and can **create** (only) `contact_submissions` without setting `status`.
- [ ] `Editor` role can CRUD content; Admin unchanged.
- [ ] A static token exists for a read-published service user; it is saved as `DIRECTUS_STATIC_TOKEN` in the local `apps/web` env (and noted for the operator to add to prod).
- [ ] `apps/cms/seed/seed.ts` exists, follows the frontend style guide (no `any`, enums, object params), is idempotent, and populates all content + the singleton + child rows.
- [ ] `bun run seed` succeeds; the Studio shows the content; `curl` of `/items/services` returns only published items; `/assets/<id>` returns an image.

When all boxes are checked, go to [`phase-4-frontend.md`](./phase-4-frontend.md).
