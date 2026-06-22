# Migration status & operator deployment runbook

Living record of the Payload → Directus migration: what's done, and exactly what the **operator** must run on prod (which sits behind the VPN and is unreachable from a dev machine — see [`AGENTS.md`](../../AGENTS.md)).

---

## Progress

| Phase                  | Status                     | What landed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1 — Infrastructure** | ✅ Done & verified locally | `directus` DB added to `POSTGRES_MULTIPLE_DATABASES`; `cms` service swapped to official **`directus/directus:12.0.2`** in [docker-compose.local.yml](../../docker-compose.local.yml) + [docker-compose.prod.yml](../../docker-compose.prod.yml) (bootstrap + `schema apply` on start, `media`→`/directus/uploads`); web repointed to `cms:8055`; [Caddyfile](../../Caddyfile) upstream → `cms:8055`; CI ([deploy.yml](../../.github/workflows/deploy.yml)) no longer builds a CMS image; env templates updated.                                                                                                                                  |
| **2 — Data model**     | ✅ Done & verified         | 11 collections (services/projects/testimonials/contact_submissions + `site_settings` singleton + 6 O2M children) built via [scripts/build-schema.ts](../../apps/cms/scripts/build-schema.ts); committed [snapshots/snapshot.yaml](../../apps/cms/snapshots/snapshot.yaml); `schema apply --dry-run` = "No changes".                                                                                                                                                                                                                                                                                                                              |
| **3 — Access + seed**  | ✅ Done & verified         | [scripts/setup-access.ts](../../apps/cms/scripts/setup-access.ts) (Public read + lead-create, Frontend role + **static token**, Editor role); demo content via [seed/seed.ts](../../apps/cms/seed/seed.ts). **Free-tier limit:** custom permission rules are licensed, so "published-only" is filtered at query time in the frontend, not at the permission layer.                                                                                                                                                                                                                                                                               |
| **Prod data**          | ✅ Tooling ready           | [scripts/migrate-from-payload.ts](../../apps/cms/scripts/migrate-from-payload.ts) + runbook [prod-data-migration.md](./prod-data-migration.md). Prod currently has **no uploaded media and no leads** → text-only migration; images are external URLs imported by Directus.                                                                                                                                                                                                                                                                                                                                                                      |
| **4 — Frontend**       | ✅ Done & verified         | `apps/web` reads Directus via `@directus/sdk` ([data.ts](../../apps/web/src/data.ts), [lib/directus.ts](../../apps/web/src/lib/directus.ts)); media via `/assets/<id>`; contact form → `/items/contact_submissions`; **Visual Editor** wired (init + CSP `frame-ancestors` + 68 `data-directus` attrs); preview route uses `DIRECTUS_PREVIEW_SECRET`. `tsc`/`eslint`/`build` clean; dev SSR confirmed rendering real Directus content.                                                                                                                                                                                                           |
| **5 — Cleanup & docs** | ✅ Done & verified         | Deleted the Payload app (`apps/cms/src`, `Dockerfile`, `next.config.ts`, eslint/vitest configs); `apps/cms` is now a thin **Bun-script** package (`snapshots/` + `seed/` + `scripts/` + minimal `package.json`/`tsconfig.json`, no build/lint task). Purged stale Payload refs from [README.md](../../README.md), [AGENTS.md](../../AGENTS.md), [.prettierignore](../../.prettierignore), `apps/web/src/data.ts`; rewrote the CMS sections of [DEPLOY.md](../../DEPLOY.md) for Directus (bootstrap/schema-apply, `directus` DB creation, setup-access + token, backups, rollback). `bun install` + `turbo run check-types/lint/build` all clean. |

> **Deployability:** the stack is deployable now and the codebase is fully de-Payloaded. Local everything works against Directus on `:8055`. The only Payload reference that intentionally remains is the one-time cutover tool [scripts/migrate-from-payload.ts](../../apps/cms/scripts/migrate-from-payload.ts) and the rollback notes (legacy `cms` DB kept intact).

---

## Operator deployment runbook (prod)

Run these on the VPS / from the authorized machine. Order matters.

### 0. Prerequisites (one-time, per release after merge)

- Decide the release tag (`vX.Y.Z`).
- Have shell access to the prod VPS and the running Postgres container name.

### 1. Create the `directus` database (one-time)

The init script only runs on a **fresh** Postgres volume; prod's volume already exists, so create it by hand once:

```bash
docker exec <postgres-container> psql -U "$POSTGRES_USER" -c "CREATE DATABASE directus;"
```

The legacy `cms` (Payload) database is left untouched for rollback.

### 2. Fill `.env.production` (one-time, then as needed)

Add the Directus vars (see [.env.production.example](../../.env.production.example)) and remove the Payload ones:

```dotenv
# add
DIRECTUS_KEY=<openssl rand -hex 32>
DIRECTUS_SECRET=<openssl rand -hex 32>
DIRECTUS_DB_DATABASE=directus
DIRECTUS_ADMIN_EMAIL=admin@dichvuyan.com
DIRECTUS_ADMIN_PASSWORD=<strong password>
DIRECTUS_PUBLIC_URL=https://cms.dichvuyan.com
DIRECTUS_PREVIEW_SECRET=<openssl rand -hex 32>
DIRECTUS_STATIC_TOKEN=          # leave blank for now — filled in step 5
# remove
# PAYLOAD_SECRET, PAYLOAD_PREVIEW_SECRET, CMS_IMAGE, CMS_PUBLIC_URL, WEB_PUBLIC_URL, CMS_PREVIEW_API_KEY
```

Also confirm the GitHub repo **variable** `NEXT_PUBLIC_CMS_URL` = `https://cms.dichvuyan.com` (baked into the web image at build).

> `DIRECTUS_STATIC_TOKEN` can stay blank initially: the web app's published reads fall back to anonymous access, which the Public policy already allows. Fill it in step 5 to give the web app an explicit credential (then re-run `up -d` for the web service).

### 3. Deploy (tag → CI → VPS)

```bash
git tag vX.Y.Z && git push origin vX.Y.Z
```

CI builds web/crm images, pulls `directus/directus:12.0.2`, and on the VPS runs `docker compose -f docker-compose.prod.yml --env-file .env.production pull && up -d`. On start the Directus container runs `directus bootstrap` (creates tables + the admin user) and `directus schema apply` (creates all collections from the committed snapshot).

Verify Directus is up: open `https://cms.dichvuyan.com` → log in with `DIRECTUS_ADMIN_EMAIL` / `DIRECTUS_ADMIN_PASSWORD`.

### 4. Set up access control (one-time)

From the repo on the VPS (or any machine that can reach the prod CMS), run the access script against prod:

```bash
cd apps/cms
DIRECTUS_PUBLIC_URL=https://cms.dichvuyan.com \
DIRECTUS_ADMIN_EMAIL=<admin> DIRECTUS_ADMIN_PASSWORD=<pw> \
bun run setup-access
```

It prints **`DIRECTUS_STATIC_TOKEN=...`**.

### 5. Wire the static token

Put the printed token into `.env.production` (`DIRECTUS_STATIC_TOKEN=...`), then re-apply so the web service picks it up:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d web
```

### 6. Migrate real content (cutover)

**While the old Payload is still running** (its image URLs must resolve), export prod Payload and import into Directus — full steps in [prod-data-migration.md](./prod-data-migration.md). Short form:

```bash
# export (on VPS, hitting the live Payload container)
mkdir -p payload-export && cd payload-export
curl -s "http://localhost:3001/api/services?depth=0&limit=1000"     > services.json
curl -s "http://localhost:3001/api/projects?depth=0&limit=1000"     > projects.json
curl -s "http://localhost:3001/api/testimonials?depth=0&limit=1000" > testimonials.json
curl -s "http://localhost:3001/api/globals/site-settings?depth=2"   > site-settings.json
# import into Directus
cd ../apps/cms
DIRECTUS_PUBLIC_URL=https://cms.dichvuyan.com \
DIRECTUS_ADMIN_EMAIL=<admin> DIRECTUS_ADMIN_PASSWORD=<pw> \
PAYLOAD_EXPORT_DIR=../../payload-export \
bun run migrate-from-payload
```

(No `MIGRATE_LEADS` and no media volume — prod has neither yet.) Skip this and run `bun run seed` instead if you only want the demo content.

### 7. Enable the Visual Editor

Two parts in the Studio:

1. **Settings → Settings → Modules** → toggle **Visual Editor** on (then it appears in the left module bar).
2. **Settings → Visual Editor** → add the **preview entry URL** (it must enter Next draft mode — the edit overlays only mount in preview):

   ```text
   https://dichvuyan.com/api/preview?secret=<DIRECTUS_PREVIEW_SECRET>&redirect=/
   ```

Both CSP directions are wired in code: the site allows the Studio to frame it (`frame-ancestors` in `apps/web/next.config.ts`) **and** Directus allows embedding the site (`CONTENT_SECURITY_POLICY_DIRECTIVES__FRAME_SRC` on the `cms` service — **not** `FRAME_ANCESTORS`, which is the wrong direction). `CACHE_AUTO_PURGE=true` makes saves refresh immediately.

### 8. Verify, then retire Payload

- `https://dichvuyan.com` renders the real content; images load from `https://cms.dichvuyan.com/assets/<id>`.
- A draft item is hidden on the live site; the contact form creates a `contact_submissions` row.
- Visual Editor: editing an element in the Studio iframe saves and the preview refreshes.
- Only then stop/remove the Payload container and do Phase 5 cleanup.

### Rollback

The legacy `cms` DB and prior Payload images are intact. Redeploy the previous tag (which still references the Payload image + `cms` DB) until any Directus issue is resolved.

---

## Backups note (update for ops)

Back up the **`directus`** database (not `cms`) and the `media`/uploads volume going forward:

```bash
docker exec <postgres-container> pg_dump -U "$POSTGRES_USER" directus > directus-$(date +%F).sql
```
