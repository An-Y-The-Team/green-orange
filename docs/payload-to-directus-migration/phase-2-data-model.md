# Phase 2 — Build the data model and snapshot it

> ⚠️ **BEFORE YOU TOUCH ANYTHING, READ AND OBEY:**
> - [`.claude/frontend-code-style.md`](../../.claude/frontend-code-style.md)
> - [`.claude/backend-code-style.md`](../../.claude/backend-code-style.md)
> - [`AGENTS.md`](../../AGENTS.md) — **Use Bun, never npm/yarn/pnpm.**
>
> Phase 1 must be DONE (a blank Directus runs at `http://localhost:8055` and you can log in). Do not start Phase 3 until this phase's "Definition of Done" passes.

## Goal of this phase

Create every collection, field, and relationship in the Directus Studio that the old Payload schema had, then **export the model to `apps/cms/snapshots/snapshot.yaml`** and commit it. The snapshot is the source of truth that gets applied to production automatically.

You will build the model **in the Studio UI** (clicking through Settings → Data Model). This is far more reliable than hand-writing the YAML. The snapshot is generated from what you built.

> **Do not create content (rows) in this phase.** Only the structure. Content is Phase 3.
> **Do not configure permissions in this phase.** That is also Phase 3.

## How to add a collection in the Studio (do this for each collection below)

1. Log in to `http://localhost:8055`.
2. Go to **Settings (gear icon) → Data Model → "+" (Create Collection)**.
3. Enter the collection **name exactly as written below** (lowercase, snake_case).
4. On the "Optional System Fields" screen: enable **Status**, **Sort**, **Created On**, **Updated On** where the field list below says so. (`status` and `sort` are used by our content; created/updated are nice to have.)
5. Save, then add each field via **"Create Field"**, choosing the **Type** and **Interface** noted below.

### Field type cheatsheet (Payload → Directus)

| Payload | Directus Type | Directus Interface |
|---|---|---|
| `text` | String | Input |
| `textarea` | Text | Textarea / WYSIWYG (use Textarea — content is plain) |
| `number` | Integer (or Float for ratings if decimals needed; ratings are whole 0–5 → Integer) | Input |
| `checkbox` | Boolean | Toggle |
| `select` (fixed options) | String | **Dropdown**, with the choices entered. **Treat every select as an enum** per the frontend style guide — the option *values* below are the closed set. |
| `upload` (single file) | UUID, as a **File** relation | File / Image |
| `array of { item: text }` (simple string list) | **JSON** | **List** interface, single string field, OR the "Tags" interface |
| `array of { ...multiple fields }` (rich repeater) | **A separate collection (O2M)** — see "Relational collections" section |
| `group` of scalar fields | **Flat prefixed fields** + a Directus presentation **Group** (the group is visual only) |

> ⚠️ **Important Directus behavior:** Directus "groups" are **presentation only** — they do NOT nest data. A Payload `company.name` becomes a flat column `company_name`. The frontend (`data.ts`, Phase 4) re-nests flat columns into the domain types. Use Directus **Group (raw)** dividers to keep the form tidy, but every scalar is a flat column.

---

## A. Content collections

For **every** content collection below, when creating it: enable the **Status** system field and the **Sort** system field. Configure Status with exactly two options so it matches Payload's draft/published behavior:
- `published` (value `published`)
- `draft` (value `draft`)
- Default value: `draft`.

Also turn on **Content Versioning** for `services`, `projects`, and `testimonials` (Settings → Data Model → the collection → toggle **Content Versioning**). This is what powers draft preview in Phase 4.

### A1. `services`

| Field | Type | Interface | Notes |
|---|---|---|---|
| `slug` | String | Input | **Required, unique.** Add a unique index (field settings → "Unique"). Mirrors Payload `slug`. |
| `title` | String | Input | Required |
| `description` | Text | Textarea | Required |
| `category` | String | Dropdown | Required. Options (enum): `cleaning`, `construction` |
| `duration` | String | Input | Required |
| `icon_name` | String | Input | Required. (Was `iconName` — a lucide-react icon name.) |
| `popular` | Boolean | Toggle | Default `false` |
| `benefits` | JSON | **List** (single string item per row) | Simple string list. |
| `features` | JSON | **List** (single string item per row) | Simple string list. |
| `meta_title` | String | Input | SEO |
| `meta_description` | Text | Textarea | SEO |
| `og_image` | File | Image | SEO. Single file. |
| (system) `sort` | Integer | — | Used for ordering (replaces Payload `order`). |
| (system) `status` | String | — | `published` / `draft`. |

### A2. `projects`

| Field | Type | Interface | Notes |
|---|---|---|---|
| `slug` | String | Input | Required, unique. |
| `title` | String | Input | Required |
| `client` | String | Input | Required |
| `category` | String | Dropdown | Required. Options: `cleaning`, `construction` |
| `location` | String | Input | Required |
| `area` | String | Input | Required |
| `completion_time` | String | Input | Required. (Was `completionTime`.) |
| `description` | Text | Textarea | Required |
| `achievement` | Text | Textarea | Required |
| `image` | File | Image | Required. Cover photo (single file). |
| `tags` | JSON | List (string) | Simple string list. |
| `testimonial_author` | String | Input | The Payload `testimonial` group is **flattened** into these 5 fields. All optional. |
| `testimonial_role` | String | Input | optional |
| `testimonial_content` | Text | Textarea | optional |
| `testimonial_rating` | Integer | Input | optional, 0–5 |
| `testimonial_avatar` | File | Image | optional (single file) |
| `meta_title` | String | Input | SEO |
| `meta_description` | Text | Textarea | SEO |
| `og_image` | File | Image | SEO |
| (system) `sort`, `status` | — | — | as above |

> **Drop the old `imageUrl` / `avatarUrl` text fields and the `resolveMediaUrl` hook entirely.** In Directus the file is referenced by id; the frontend builds the URL as `${NEXT_PUBLIC_CMS_URL}/assets/<file-id>`. Do not recreate the mirrored-URL hack.

### A3. `testimonials`

| Field | Type | Interface | Notes |
|---|---|---|---|
| `slug` | String | Input | Required, unique |
| `author` | String | Input | Required |
| `role` | String | Input | Required |
| `company` | String | Input | Required |
| `content` | Text | Textarea | Required |
| `rating` | Integer | Input | Required, 0–5 |
| `avatar` | File | Image | optional (single file) |
| `category` | String | Dropdown | Required. Options: `cleaning`, `construction`, `both` |
| (system) `sort`, `status` | — | — | as above |

### A4. `contact_submissions`

Create this collection with the **Status** system field but **NO Content Versioning** (leads are not drafts). Status options here are different:
- `new` (default), `processing`, `contacted`.

| Field | Type | Interface | Notes |
|---|---|---|---|
| `full_name` | String | Input | Required |
| `email` | String | Input | optional |
| `phone` | String | Input | Required |
| `service_category` | String | Dropdown | Required. Options: `cleaning`, `construction`, `both` |
| `service_id` | String | Input | optional. References a `services.slug`. |
| `company_name` | String | Input | optional |
| `address` | String | Input | optional |
| `message` | Text | Textarea | optional |
| (system) `status` | String | — | `new` / `processing` / `contacted`, default `new` |

> Public visitors will be allowed to **create** rows here (Phase 3 permissions) but must NOT be able to set `status` — that is enforced via Phase 3 field permissions, not here.

---

## B. The `site_settings` singleton

1. Create a collection named **`site_settings`**.
2. In its collection settings, enable **"Treat as single object" / Singleton**. (Settings → Data Model → `site_settings` → toggle **Singleton**.)
3. Do **NOT** enable Status/Versioning here — site settings publish immediately (same as the old Payload global).

Add the following **flat scalar fields**. Use Directus presentation **Groups** (raw groups) to organize them under the same tabs Payload used, but remember the data is flat. File fields are single **File/Image**.

**Company group:** `company_name`, `company_short_name`, `company_founded`, `company_phone`, `company_email`, `company_address`, `company_branch`, `company_motto`, `company_certification` (all String/Input; `company_address` can be Text).

**Social group:** `social_facebook`, `social_zalo`, `social_messenger` (String/Input, optional).

**Branding group:** `branding_logo_text_primary`, `branding_logo_text_secondary`, `branding_header_tagline`, `branding_footer_tagline` (String/Input).

**Navigation group (scalars only — the items list is a relation, see section C):** `navigation_header_cta_label`, `navigation_mobile_cta_label` (String/Input).

**Typography group (all String/Dropdown — enums):**
- `typography_heading_font` — options: `be-vietnam-pro`, `manrope`, `playfair-display`, `lora`
- `typography_hero_display_font` — options: `playfair-display`, `lora`, `dm-serif-display`
- `typography_body_font` — options: `be-vietnam-pro`, `inter`, `lexend`, `nunito-sans`, `lora`

**Hero group (scalars; segments/benefits/stats are relations/JSON — see C):**
- `hero_background_image` (File/Image)
- `hero_trust_badge` (String)
- `hero_subheadline` (Text)
- `hero_benefits` (**JSON List of strings** — simple list, NOT a relation)
- `hero_primary_cta_label`, `hero_primary_cta_href` (String)
- `hero_secondary_cta_label`, `hero_secondary_cta_href` (String)
- `hero_trust_strap` (String)

**Introduction group (scalars):**
- `introduction_eyebrow`, `introduction_heading` (String)
- `introduction_narrative` (Text — supports a `{founded}` placeholder; just store the raw string)
- `introduction_image` (File/Image)
- `introduction_motto_eyebrow`, `introduction_brand_story_heading` (String)
- `introduction_brand_story_intro` (Text)
- `introduction_process_eyebrow`, `introduction_process_heading` (String)
- `introduction_process_intro` (Text)
- (`brand_values` and `process_steps` are relations — section C)

**Section copy groups (String/Text):**
- `services_section_eyebrow`, `services_section_heading`, `services_section_description`
- `projects_section_eyebrow`, `projects_section_heading`, `projects_section_description`
- `testimonials_section_eyebrow`, `testimonials_section_heading`, `testimonials_section_description`

**Footer group (scalars; quick links are a relation — section C):**
- `footer_brand_description` (Text)
- `footer_quick_links_heading` (String)
- `footer_offices_heading`, `footer_headquarters_label`, `footer_branch_label`, `footer_support_heading` (String)
- `footer_hotline_prefix`, `footer_email_prefix`, `footer_copyright_suffix`, `footer_back_to_top_label` (String)

**SEO group:**
- `seo_meta_title` (String), `seo_meta_description` (Text), `seo_og_image` (File/Image)

---

## C. Relational child collections (the rich repeaters)

These are the Payload arrays that have **more than one sub-field**, so per the agreed design they become **separate collections** linked O2M to `site_settings`. (Single-string lists like `hero_benefits`, `services.benefits/features`, `projects.tags` are JSON lists, already handled above — do NOT make collections for those.)

For each child collection: create it with a **Sort** system field, then add a **Many-to-One** field pointing back to `site_settings`, then add the data fields. The easiest way in the Studio:

1. Open `site_settings` in Data Model.
2. **Create Field → Relational → One to Many.**
3. Set the related collection name (Directus offers to create it). Name it as below.
4. After creation, open the new child collection and add its data fields + a **Sort** system field.

Create these six O2M relations on `site_settings`:

### C1. `site_nav_items` (header navigation)
- `label` (String), `section_id` (String/Dropdown — options: `hero`, `introduction`, `services`, `projects`, `testimonials`, `contact`)
- O2M field name on `site_settings`: `nav_items`

### C2. `site_footer_links` (footer quick links)
- `label` (String), `section_id` (String/Dropdown — same options as C1)
- O2M field on `site_settings`: `footer_quick_links`

### C3. `site_hero_segments` (hero headline pieces)
- `text` (String), `color` (Dropdown — options: `white`, `emerald`, `orange`), `italic` (Boolean), `new_line_before` (Boolean)
- O2M field on `site_settings`: `hero_headline_segments`

### C4. `site_stats`
- `value` (String), `label` (String), `color` (String)
- O2M field on `site_settings`: `stats`

### C5. `site_brand_values`
- `title` (String), `description` (Text), `icon` (Dropdown — options: `Wrench`, `ShieldCheck`, `Trees`), `accent` (Dropdown — options: `orange`, `slate`, `emerald`)
- O2M field on `site_settings`: `brand_values`

### C6. `site_process_steps`
- `num` (String), `title` (String), `description` (Text)
- O2M field on `site_settings`: `process_steps`

> Every child collection MUST have the **Sort** system field enabled so the order the editor sets is preserved. In the Studio, enable "Sortable" on the O2M field so editors can drag-reorder.

---

## D. Sanity check the model in the Studio

- [ ] Six top-level collections exist: `services`, `projects`, `testimonials`, `contact_submissions`, `site_settings`, plus the six `site_*` child collections.
- [ ] `site_settings` is a **singleton**.
- [ ] `services`/`projects`/`testimonials` have **Status** (`published`/`draft`) and **Content Versioning** on.
- [ ] Every `select`-style field is a **Dropdown with a fixed option list** (these are our enums).
- [ ] File fields (`image`, `avatar`, `og_image`, `hero_background_image`, etc.) are **File/Image** type.
- [ ] No `imageUrl`/`avatarUrl` text fields were recreated.

## E. Export the snapshot (the committed artifact)

Run the Directus CLI **inside the running container** to write the snapshot into the mounted folder:

```bash
docker exec -it <cms-container-name> npx directus schema snapshot --yes /directus/snapshots/snapshot.yaml
```

(`<cms-container-name>` is the Directus container — find it with `docker compose -f docker-compose.local.yml ps`.)

Because `./apps/cms/snapshots` is bind-mounted to `/directus/snapshots`, the file appears at [`apps/cms/snapshots/snapshot.yaml`](../../apps/cms/snapshots/snapshot.yaml) on your machine. **Commit it.**

Verify the apply path works (this is what prod runs on every deploy):

```bash
docker exec -it <cms-container-name> npx directus schema apply --yes /directus/snapshots/snapshot.yaml
# Expect: "No changes to apply." since the live DB already matches the snapshot.
```

## Definition of Done (all must pass before Phase 3)

- [ ] All collections/fields/relations from sections A–C exist in the Studio and match the tables above.
- [ ] `apps/cms/snapshots/snapshot.yaml` exists, is committed, and `schema apply` reports "No changes to apply" against the live DB.
- [ ] The compose `command` from Phase 1 now actually applies a real snapshot on boot (remove the `|| echo 'no snapshot yet'` guard if you like, or leave it — it's harmless).

When all boxes are checked, go to [`phase-3-roles-and-seed.md`](./phase-3-roles-and-seed.md).
