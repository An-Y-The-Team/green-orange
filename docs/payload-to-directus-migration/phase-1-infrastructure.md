# Phase 1 — Infrastructure: make a blank Directus run

> ⚠️ **BEFORE YOU TOUCH ANYTHING, READ AND OBEY:**
> - [`.claude/frontend-code-style.md`](../../.claude/frontend-code-style.md)
> - [`.claude/backend-code-style.md`](../../.claude/backend-code-style.md)
> - [`AGENTS.md`](../../AGENTS.md) — **Use Bun, never npm/yarn/pnpm.**
>
> This phase mostly edits Docker/YAML/env/CI files. There is almost no app code. Do **not** start Phase 2 until the "Definition of Done" at the bottom passes.

## Goal of this phase

After this phase, a **completely empty** Directus instance starts up:
- locally with `docker compose ... up`,
- and on the production VPS through the existing deploy pipeline,
- using a **new, separate `directus` Postgres database** (the old `cms` database is left alone),
- reachable in dev at `http://localhost:8055`,
- with the file-upload volume reused so media survives restarts.

We are **not** creating any collections or content yet — that's Phase 2 and 3.

## Background facts you must know

- Directus default HTTP port is **8055** (Payload used **3001**). The Caddy reverse proxy upstream must change.
- The official image is `directus/directus`. **Pin an exact version tag** (do NOT use `latest`). Check the latest stable tag at https://hub.docker.com/r/directus/directus/tags — at time of writing the line is `11.x`. Use the exact number, e.g. `directus/directus:11.12.0`.
- Directus needs **two random secrets**: `KEY` and `SECRET`. Generate each with `openssl rand -hex 32`.
- Directus creates its first admin user from `ADMIN_EMAIL` + `ADMIN_PASSWORD` on first boot (via `directus bootstrap`).
- Directus stores uploaded files in `/directus/uploads` inside the container.

## Step 1 — Add the new `directus` database

The repo seeds Postgres databases on first boot with [`init-multiple-databases.sh`](../../init-multiple-databases.sh). Open it and add `directus` to the list of databases it creates (it currently creates `cms`, `crm`, `authentik`).

- Find the variable / loop that lists the database names and **add `directus`**.
- Keep the existing databases exactly as they are. Do **not** delete or rename `cms`.

> ⚠️ This script only runs when the Postgres data volume is **first** created. On an existing local volume the `directus` DB will NOT appear automatically. To force it locally, you may either (a) recreate the dev DB volume (`docker compose -f docker-compose.yml down -v` then `up` — **destroys local data, fine for dev**), or (b) create the DB by hand once:
> ```bash
> docker exec -it green-orange-dev psql -U postgres -c "CREATE DATABASE directus;"
> ```
> On production, the operator runs the equivalent `CREATE DATABASE directus;` inside the prod Postgres container **once** (see Phase 5 docs update). Per [`AGENTS.md`](../../AGENTS.md), you cannot reach prod from this machine — hand that command to the operator.

## Step 2 — Add Directus environment variables to the env templates

Edit these three files. **Only edit `*.example` templates here — never commit real secrets.**

1. [`.env.production.example`](../../.env.production.example)
2. [`apps/cms/.env.example`](../../apps/cms/.env.example)
3. The web env example used by `apps/web` (find it — likely `apps/web/.env.example`).

**Add** these Directus variables (with placeholder values in the example files):

```dotenv
# --- Directus CMS ---
DIRECTUS_KEY=replace-with-openssl-rand-hex-32
DIRECTUS_SECRET=replace-with-openssl-rand-hex-32
DIRECTUS_DB_DATABASE=directus
DIRECTUS_ADMIN_EMAIL=admin@example.com
DIRECTUS_ADMIN_PASSWORD=replace-with-strong-password
# Public origin of the CMS (dev: http://localhost:8055 ; prod: https://${CMS_DOMAIN})
DIRECTUS_PUBLIC_URL=http://localhost:8055
# Static token the web app uses for server-side reads (created in Phase 3)
DIRECTUS_STATIC_TOKEN=replace-after-phase-3
```

**Mark as REMOVED (Payload-only — delete or comment out):**
`PAYLOAD_SECRET`, `PAYLOAD_PREVIEW_SECRET`, `CMS_PUBLIC_URL`, `WEB_PUBLIC_URL`, `CMS_PREVIEW_API_KEY`.

> Keep `CMS_DOMAIN`, `SITE_DOMAIN`, `ACME_EMAIL`, the `POSTGRES_*` vars, and `NEXT_PUBLIC_CMS_URL` / `NEXT_PUBLIC_SITE_URL` — they are still used.

For `apps/web`, keep / set:
- `NEXT_PUBLIC_CMS_URL` → now points at the Directus origin (`http://localhost:8055` dev, `https://${CMS_DOMAIN}` prod). The frontend builds asset URLs from this.
- `DIRECTUS_STATIC_TOKEN` (server-only) → filled in after Phase 3.
- A preview secret for the draft route, e.g. `DIRECTUS_PREVIEW_SECRET` (server-only) → reused by `apps/web/src/app/api/preview/route.ts` in Phase 4.

## Step 3 — Replace the `cms` service in the compose files

There are three compose files. Edit the two that define an app-level `cms` service:
- [`docker-compose.local.yml`](../../docker-compose.local.yml) (builds everything locally)
- [`docker-compose.prod.yml`](../../docker-compose.prod.yml) (pulls prebuilt images on the VPS)

(The dev-only [`docker-compose.yml`](../../docker-compose.yml) just runs Postgres — you only touched it in Step 1's note.)

In **both** files, find the existing `cms:` service (it currently uses a built image / Payload Dockerfile and exposes port 3001) and **replace it** with the official Directus image. Use this as the template, adapting the network name, volume names, and env-var interpolation to match the **existing conventions in that same file** (look at how the other services reference networks/volumes/env):

```yaml
cms:
  image: directus/directus:11.12.0   # PIN the real latest stable tag
  restart: unless-stopped
  depends_on:
    postgres:
      condition: service_healthy
  volumes:
    - media:/directus/uploads                      # reuse the SAME volume Payload used for media
    - ./apps/cms/snapshots:/directus/snapshots:ro  # data model as code (Phase 2 fills this)
    - ./apps/cms/extensions:/directus/extensions    # empty for now
  environment:
    KEY: ${DIRECTUS_KEY}
    SECRET: ${DIRECTUS_SECRET}
    DB_CLIENT: pg
    DB_HOST: postgres
    DB_PORT: 5432
    DB_DATABASE: ${DIRECTUS_DB_DATABASE}
    DB_USER: ${POSTGRES_USER}
    DB_PASSWORD: ${POSTGRES_PASSWORD}
    PUBLIC_URL: ${DIRECTUS_PUBLIC_URL}
    ADMIN_EMAIL: ${DIRECTUS_ADMIN_EMAIL}
    ADMIN_PASSWORD: ${DIRECTUS_ADMIN_PASSWORD}
    CORS_ENABLED: "true"
    CORS_ORIGIN: ${DIRECTUS_PUBLIC_URL}   # comma-separate to add the site origin too
    WEBSOCKETS_ENABLED: "true"
    # Allow the Studio to embed the public site in an iframe for the Visual Editor (Phase 4):
    CONTENT_SECURITY_POLICY_DIRECTIVES__FRAME_ANCESTORS: "'self' ${DIRECTUS_PUBLIC_URL}"
  # In dev, expose the port directly so you can open the Studio:
  ports:
    - "8055:8055"
```

Notes:
- In `docker-compose.prod.yml`, the site sits behind Caddy, so you usually do **not** publish `8055` to the host there — match how the old `cms` service handled ports (it likely had no public `ports:` and relied on Caddy). Keep that pattern: **no host port in prod**, host port only in `docker-compose.local.yml`.
- The `media` volume name MUST match what Payload used (search the old compose files for the volume mounted at the Payload media dir). Reusing the name keeps the volume; the files inside are Payload-formatted and will be re-uploaded in Phase 3, so existing contents don't matter.
- Set `CORS_ORIGIN` to include the **site** origin (`SITE_DOMAIN`) as well as the CMS origin, comma-separated, e.g. `https://${CMS_DOMAIN},https://${SITE_DOMAIN}`. In dev: `http://localhost:8055,http://localhost:3000`.

## Step 4 — Bootstrap the schema/admin on startup (prod)

The official image's default command just starts the server. We need it to also run `directus bootstrap` (create tables + admin) and apply the committed schema snapshot before serving. Override the command in **both** compose files' `cms` service:

```yaml
    command: >
      sh -c "npx directus bootstrap &&
             (npx directus schema apply --yes /directus/snapshots/snapshot.yaml || echo 'no snapshot yet') &&
             npx directus start"
```

- `directus bootstrap` is **idempotent** — safe to run on every boot. It creates DB tables on first run and the admin user from `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
- The `|| echo 'no snapshot yet'` guard lets the container boot in Phase 1 when `snapshot.yaml` does not exist yet. Phase 2 creates the file; after that the apply runs for real.

## Step 5 — Update the Caddy reverse proxy

Open [`Caddyfile`](../../Caddyfile). Find the block that proxies the CMS domain (`{$CMS_DOMAIN}`) to the old Payload container on port **3001** and change the upstream port to **8055**:

```caddyfile
{$CMS_DOMAIN} {
    # ... keep the existing request_body max_size 25MB line ...
    reverse_proxy cms:8055
}
```

Keep everything else (TLS, the 25 MB upload limit, the other domains) unchanged.

## Step 6 — Update CI/CD: stop building a CMS image

Open [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml). The pipeline currently **builds and pushes a `cms` image** from `apps/cms/Dockerfile`. We no longer build the CMS — we pull the official image.

Do all of the following:
1. **Remove the `cms` entry** from the build matrix / the per-app build+push job (the step that builds `apps/cms/Dockerfile` and pushes `ghcr.io/.../green-orange-cms`).
2. **Remove `apps/cms`** from the change-detection (`changes`) job paths so a CMS image is never expected.
3. In the `deploy` job, ensure the `docker compose -f docker-compose.prod.yml --env-file .env.production pull && up -d` step remains — it now pulls the pinned `directus/directus` image automatically. Nothing else to add there.
4. Leave the `web`, `crm-web`, `crm-api` build jobs untouched. `NEXT_PUBLIC_CMS_URL` is still baked into the web image.

## Step 7 — Create the config-as-code folders

Create these empty folders so the compose volume mounts succeed (Phase 2/3 fill them):

```bash
mkdir -p apps/cms/snapshots apps/cms/extensions apps/cms/seed
```

Add a `.gitkeep` to `apps/cms/extensions` so the empty dir is committed.

> You will fully gut the old Payload `apps/cms` source in **Phase 5**, not now. For Phase 1, just add the new folders alongside the old code.

## Step 8 — Run it locally and verify

From the repo root (use **Bun**-based scripts per AGENTS.md, but Docker is invoked directly):

```bash
# 1. Make sure your local .env (copied from the .example files) has the DIRECTUS_* vars filled in.
# 2. Bring up the local stack (adjust the file/flags to match how the repo normally runs locally):
docker compose -f docker-compose.local.yml --env-file .env up -d --build cms postgres
# 3. Watch the logs until Directus reports it is listening on 8055:
docker compose -f docker-compose.local.yml logs -f cms
```

## Definition of Done (all must pass before Phase 2)

- [ ] `init-multiple-databases.sh` creates a `directus` database (and still creates `cms`, `crm`, `authentik`).
- [ ] Both `docker-compose.local.yml` and `docker-compose.prod.yml` define `cms` as `directus/directus:<pinned-tag>` with the env vars above; prod has **no** public host port, local exposes `8055`.
- [ ] `Caddyfile` proxies `{$CMS_DOMAIN}` → `cms:8055`.
- [ ] `.github/workflows/deploy.yml` no longer builds/pushes a CMS image and no longer references `apps/cms` in change detection.
- [ ] `apps/cms/snapshots`, `apps/cms/extensions`, `apps/cms/seed` exist.
- [ ] The three env example files document the `DIRECTUS_*` vars and no longer require `PAYLOAD_*`.
- [ ] **Opening `http://localhost:8055` shows the Directus login screen**, and you can log in with `DIRECTUS_ADMIN_EMAIL` / `DIRECTUS_ADMIN_PASSWORD`.
- [ ] The instance is **empty** (no custom collections) — that is expected.

When all boxes are checked, go to [`phase-2-data-model.md`](./phase-2-data-model.md).
