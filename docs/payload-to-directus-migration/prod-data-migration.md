# Prod data migration: Payload → Directus

> ⚠️ **READ AND OBEY** [`.claude/frontend-code-style.md`](../../.claude/frontend-code-style.md), [`.claude/backend-code-style.md`](../../.claude/backend-code-style.md), [`AGENTS.md`](../../AGENTS.md) (Bun-only; **prod is behind the VPN — only the operator can reach it**).

## Why this exists (read first)

`apps/cms/seed/seed.ts` holds the **original DEMO content**. Production Payload holds the **real, editor-curated content** which has since **diverged** from the demo. Re-running the seed would overwrite live content with stale demo text.

> **Current prod state (confirmed):** there are **no uploaded media files and no leads** in prod yet. So this is a **text-only** migration, and the project/testimonial images are still **external image URLs** (e.g. Unsplash) — the migration imports those URLs into the Directus file library directly. There is **no Payload `media` volume to copy** and **no `contact_submissions` to carry over**. The leads/media machinery in the script stays for future-proofing but is a no-op today.

So there are **two separate jobs**:

| Job                                    | Script                                                                                       | When                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------- |
| Seed DEMO data (local dev, fresh envs) | [`apps/cms/seed/seed.ts`](../../apps/cms/seed/seed.ts)                                       | dev / CI / a brand-new empty instance |
| Migrate REAL prod content              | [`apps/cms/scripts/migrate-from-payload.ts`](../../apps/cms/scripts/migrate-from-payload.ts) | **once, at cutover**                  |

**Do NOT bake prod content into the committed `seed.ts`.** It churns the repo, can leak lead PII into git, and bloats history with edited copy/media. Keep `seed.ts` as demo; use the migration script (fed by a prod export) for the real data.

## How it maps Payload → Directus

Payload mirrors uploaded media into `imageUrl` / `avatarUrl` **text fields** (the old `resolveMediaUrl` hook), so a **depth=0** export of the collections already contains absolute image URLs. The `site_settings` global's images (`hero.backgroundImage`, `introduction.image`, `seo.ogImage`) have **no** mirror field, so the global must be exported at **depth≥1** so they resolve to `{ url }`.

| Payload (export)                                           | Directus                                                   | Transform                         |
| ---------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------- |
| `iconName`                                                 | `icon_name`                                                | rename                            |
| `completionTime`                                           | `completion_time`                                          | rename                            |
| `benefits`/`features`/`tags` = `[{item}]`                  | `string[]`                                                 | `.map(o => o.item)`               |
| `testimonial.{author,role,content,rating}` (group)         | `testimonial_author/role/content/rating`                   | flatten                           |
| `imageUrl` / `avatarUrl` / `media.url`                     | `image` / `avatar` / `og_image` … (file UUID)              | `POST /files/import { url }` → id |
| `_status` (`published`/`draft`)                            | `status`                                                   | map (default `published`)         |
| `order`                                                    | `sort`                                                     | rename                            |
| nested groups (`company`, `hero`, `footer`, …)             | flat `company_*`, `hero_*`, `footer_*`                     | flatten                           |
| repeaters (`navigation.items`, `hero.headlineSegments`, …) | O2M child rows (`site_nav_items`, `site_hero_segments`, …) | reset + recreate                  |

The script is **idempotent**: upsert-by-`slug` for collections, patch for the singleton, reset for O2M children, dedupe media by URL (imported only when an item is first created).

## Step 1 — Operator exports prod Payload (run on the VPS)

You cannot reach prod from a dev machine. The operator runs this **on the VPS**, hitting the still-running Payload `cms` container. Export the collections at `depth=0` and the global at `depth=2`:

```bash
# On the VPS, in a scratch dir. CMS is reachable at http://localhost:3001 inside the host
# (or use the public https://<CMS_DOMAIN>). Add the API key header to include drafts;
# omit it to export only published content.
mkdir -p payload-export && cd payload-export
KEY="users API-Key <PROD_API_KEY>"   # optional; from a Payload user with useAPIKey

curl -s -H "Authorization: $KEY" "http://localhost:3001/api/services?depth=0&limit=1000"       > services.json
curl -s -H "Authorization: $KEY" "http://localhost:3001/api/projects?depth=0&limit=1000"       > projects.json
curl -s -H "Authorization: $KEY" "http://localhost:3001/api/testimonials?depth=0&limit=1000"   > testimonials.json
curl -s -H "Authorization: $KEY" "http://localhost:3001/api/globals/site-settings?depth=2"     > site-settings.json
# Leads: NOT needed currently (no contact submissions in prod). Only export this
# if leads exist by cutover time, and then run with MIGRATE_LEADS=true:
# curl -s -H "Authorization: $KEY" "http://localhost:3001/api/contact-submissions?depth=0&limit=10000" > contact-submissions.json
```

Each `*` collection file is the raw Payload list response (`{ "docs": [...] }`); `site-settings.json` is the raw global object. Sanity-check a file: `jq '.docs | length' services.json`.

## Step 2 — Run the migration into Directus

Two input modes — pick whichever the network allows:

**File mode (recommended given the VPN):** copy the `payload-export/` folder to wherever the new Directus + this repo run, then:

```bash
cd apps/cms
DIRECTUS_PUBLIC_URL=https://<CMS_DOMAIN> \
DIRECTUS_ADMIN_EMAIL=<admin email> \
DIRECTUS_ADMIN_PASSWORD=<admin password> \
PAYLOAD_EXPORT_DIR=../../payload-export \
bun run migrate-from-payload
# add MIGRATE_LEADS=true to also import contact_submissions (PII)
```

**Live mode** (only if the Directus host can reach prod Payload): skip the export files and set `PAYLOAD_URL=https://<CMS_DOMAIN>` (+ `PAYLOAD_API_KEY=<key>`); the script fetches the REST API directly.

> **Media (current state = external URLs):** prod has no Payload uploads, so project/testimonial images are external URLs (Unsplash). The script imports them via Directus `POST /files/import`, and since those URLs are public, the import does **not** depend on prod Payload being alive. (If editors upload real files to Payload before cutover, those become `<CMS_DOMAIN>/media/...` URLs — then prod **must** be reachable while the migration runs so they resolve, or copy the `media` volume out and host it. Re-export and re-run; no script change needed.)

## Step 3 — Cutover ordering

1. New Directus is up with the schema applied (Phase 1–2) and access configured (Phase 3 `setup-access`).
2. **Run `migrate-from-payload`** (this doc) — pulls real content while Payload is still alive.
3. Point `apps/web` at Directus and deploy (Phase 4).
4. Verify the live site shows the real content; only then retire Payload (Phase 5).

## Verification

```bash
TOKEN=$(curl -s -X POST https://<CMS_DOMAIN>/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"<admin>","password":"<pw>"}' | jq -r .data.access_token)
# Counts should match prod:
for c in services projects testimonials; do
  echo "$c: $(curl -s -H "Authorization: Bearer $TOKEN" "https://<CMS_DOMAIN>/items/$c?aggregate[count]=*" | jq -r '.data[0].count')"
done
# Spot-check a known prod item's real (edited) title, and that its image resolves:
curl -s -H "Authorization: Bearer $TOKEN" "https://<CMS_DOMAIN>/items/projects?fields=slug,title,image&limit=2" | jq
```

Confirm a project's `image` is a file UUID and `https://<CMS_DOMAIN>/assets/<uuid>` returns the image; confirm `site_settings.company_name` and `nav_items` match prod; confirm `benefits`/`features`/`tags` are plain string arrays.

## Notes & limits

- **Drafts:** the migration sets `status` from Payload `_status`. The live site filters `status=published` at query time (Phase 3/4 free-tier note), so drafts won't render but are carried over.
- **Re-runnable:** safe to run again (upsert by slug). Images are not re-imported for items that already exist — if you re-export after further prod edits and want fresh images, delete the affected Directus items first or extend the script to diff.
- **Leads** contain PII — only migrate with `MIGRATE_LEADS=true`, and never commit `contact-submissions.json`.
- This was validated locally against a synthetic Payload-shaped export (field renames, `{item}`→`string[]`, testimonial flatten, `_status`→`status`, media import + dedupe all confirmed). It has **not** been run against real prod — that is the operator's cutover step.
