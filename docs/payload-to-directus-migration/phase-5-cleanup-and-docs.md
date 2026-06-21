# Phase 5 — Remove Payload, finalize docs & deploy

> ⚠️ **BEFORE YOU TOUCH ANYTHING, READ AND OBEY:**
> - [`.claude/frontend-code-style.md`](../../.claude/frontend-code-style.md)
> - [`.claude/backend-code-style.md`](../../.claude/backend-code-style.md)
> - [`AGENTS.md`](../../AGENTS.md) — **Use Bun. Production is behind a VPN/VPS — you cannot run prod commands from this machine; hand them to the operator.**
>
> Phases 1–4 must be DONE and verified locally end-to-end. Only now do we delete the old Payload code, so we always had a working fallback while building.

## Goal of this phase

1. Delete the Payload application code and dependencies (the `directus` DB and config-as-code stay).
2. Convert `apps/cms` into a thin Directus config package.
3. Update deployment docs.
4. Ship it through the existing tag-based pipeline and have the operator finish prod setup.

## Step 1 — Delete the Payload app code

Delete the Payload source under `apps/cms/src` and its Payload-specific config/build files:

- `apps/cms/src/payload.config.ts`
- `apps/cms/src/payload-types.ts`
- `apps/cms/src/seed.ts` (its data was ported in Phase 3)
- `apps/cms/src/collections/`, `apps/cms/src/globals/`, `apps/cms/src/access/`, `apps/cms/src/hooks/`, `apps/cms/src/migrations/`, `apps/cms/src/app/`
- `apps/cms/Dockerfile` (we use the official image now)
- `apps/cms/next.config.ts` and any Next.js-specific files for the CMS

**Keep:**
- `apps/cms/snapshots/snapshot.yaml` (Phase 2)
- `apps/cms/seed/` (Phase 3)
- `apps/cms/extensions/` (empty, with `.gitkeep`)
- `apps/cms/.env.example` (rewritten for Directus in Phase 1)

## Step 2 — Rewrite `apps/cms/package.json` as a thin config package

Replace the Payload dependencies with just what the seed/CLI helpers need. Use Bun.

```bash
cd apps/cms
# remove Payload deps:
bun remove payload @payloadcms/next @payloadcms/db-postgres @payloadcms/richtext-lexical @payloadcms/plugin-seo @payloadcms/translations next react react-dom graphql sharp 2>/dev/null || true
# keep/add dev deps for the seed script (from Phase 3):
bun add -d @directus/sdk tsx dotenv
```

The resulting `apps/cms/package.json` should be minimal — a `name`, and `scripts` for `seed` (and documentation-only `schema:snapshot` / `schema:apply` helpers that remind you to run inside the container). Remove `build`/`dev`/`start`/`payload`/`generate:*` scripts (there is no app to build anymore).

> ⚠️ **Turbo wiring:** Check [`turbo.json`](../../turbo.json) and the root [`package.json`](../../package.json) workspaces. Since `apps/cms` no longer builds a Next app, ensure `turbo run build` / `turbo run dev` don't expect a `build`/`dev` task in `apps/cms` (either remove the tasks from the cms `package.json` so Turbo skips it, or exclude it). `turbo run lint`/`format` may still apply to the seed script — keep those if they pass.

## Step 3 — Remove lingering Payload references

Grep the repo and clean up:

```bash
grep -rIn --exclude-dir=node_modules --exclude-dir=.git -e "payload" -e "Payload" -e "PAYLOAD_" -e "live-preview-react" .
```

Resolve every hit:
- Env example files: remove `PAYLOAD_SECRET`, `PAYLOAD_PREVIEW_SECRET`, `CMS_PUBLIC_URL`, `WEB_PUBLIC_URL`, `CMS_PREVIEW_API_KEY` (done in Phase 1, double-check).
- `apps/web`: ensure `@payloadcms/live-preview-react` is removed (`cd apps/web && bun remove @payloadcms/live-preview-react`) and no imports remain.
- Any README/comment that says "Payload" should now say "Directus" or be removed.

## Step 4 — Update `AGENTS.md`

Edit [`AGENTS.md`](../../AGENTS.md): the "Production access" section gives Payload examples (`payload migrate`, `payload run src/seed.ts`). Replace them with the Directus equivalents the operator now runs **inside the Directus container on the VPS**:

- Schema apply: `docker exec <cms-container> npx directus schema apply --yes /directus/snapshots/snapshot.yaml`
- Bootstrap/admin: handled by `directus bootstrap` on container start.
- Seed: run the SDK seed (`bun run seed` from `apps/cms`) pointed at the prod Directus URL with admin creds — operator runs from the authorized machine, or runs a one-off container.

## Step 5 — Update `DEPLOY.md`

Edit [`DEPLOY.md`](../../DEPLOY.md). Update the CMS-related sections:
- **CMS service**: now the official `directus/directus:<pinned>` image; no build step; `directus bootstrap` + `schema apply` run on container start.
- **First-time prod DB**: operator creates the `directus` database once: `docker exec <postgres-container> psql -U $POSTGRES_USER -c "CREATE DATABASE directus;"` (the init script only fires on a fresh Postgres volume).
- **First admin**: created from `DIRECTUS_ADMIN_EMAIL` / `DIRECTUS_ADMIN_PASSWORD`.
- **Permissions & token**: the operator repeats Phase 3's Studio steps on prod (Public policy read-published, Editor role, the frontend service user + static token) and sets `DIRECTUS_STATIC_TOKEN` in `.env.production`. Alternatively, run the Phase 3 seed against prod which can also create these via SDK.
- **Visual Editor**: operator adds the site origin to **Settings → Visual Editor** and confirms the CSP `frame-ancestors` matches.
- **Backups**: now back up the `directus` database (not `cms`) and the `media`/uploads volume. Update the `pg_dump` target DB name.
- **Env vars**: replace the Payload var table with the `DIRECTUS_*` vars from Phase 1.

## Step 6 — Lint, format, build locally

```bash
turbo run lint
turbo run format
turbo run build      # builds apps/web (and others); apps/cms no longer builds
```

Fix anything the style guides flag (no `any`, enums, import order, etc.).

## Step 7 — Ship

Per the repo's release flow ([`DEPLOY.md`](../../DEPLOY.md) §7 and the `.husky/pre-push` rule that blocks direct pushes to `main`):
1. Open a PR (do not push to `main` directly).
2. After merge, tag a release (`git tag vX.Y.Z && git push origin vX.Y.Z`) to trigger [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml).
3. The pipeline builds `web`/`crm-web`/`crm-api` and pulls the official `directus/directus` image; the deploy job runs `docker compose ... pull && up -d`, and the Directus container bootstraps + applies the schema on start.

> ⚠️ **You cannot do prod steps from this machine** (VPN/VPS — see AGENTS.md). Hand the operator: (a) create the `directus` DB once, (b) fill `.env.production` with the `DIRECTUS_*` vars + the static token, (c) run/verify the Phase 3 permission setup + seed on prod, (d) confirm the Visual Editor works on the live site.

## Step 8 — Post-deploy verification (operator, on prod)

- [ ] `https://<CMS_DOMAIN>` shows the Directus login; admin can log in.
- [ ] `https://<SITE_DOMAIN>` renders all sections; images load from `https://<CMS_DOMAIN>/assets/<id>`.
- [ ] Draft vs published visibility works on the live site.
- [ ] The Visual Editor loads the live site in an iframe and edits save + refresh.
- [ ] The contact form creates a `contact_submissions` row.
- [ ] Backups now target the `directus` DB + uploads volume.

## Rollback (if prod breaks)

Because the old Payload `cms` database was left intact and Payload images are still in GHCR history, you can roll back by redeploying the previous tag (which still references the Payload `cms` image and `cms` DB) until the Directus issue is fixed. Document this in `DEPLOY.md`.

## Definition of Done (migration complete)

- [ ] No Payload code or dependencies remain (grep is clean).
- [ ] `apps/cms` is a thin Directus config package (`snapshots/`, `seed/`, `extensions/`, minimal `package.json`).
- [ ] `turbo run lint/format/build` pass.
- [ ] `AGENTS.md` and `DEPLOY.md` describe the Directus workflow.
- [ ] Shipped via tag; operator confirmed prod (Step 8).
