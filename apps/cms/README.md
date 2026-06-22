# @yan-portf/cms — Directus config-as-code

The headless content backend for GreenOrange Services. Manages services, projects,
testimonials, site settings, and captures contact-form leads.

**Directus does not live in this package.** It runs from the official
[`directus/directus`](https://hub.docker.com/r/directus/directus) Docker image,
wired up as the `cms` service in the repo-root compose files. This package only
holds the **config-as-code** that brings a blank Directus to life:

| Path                              | What it is                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------- |
| `snapshots/snapshot.yaml`         | The data model (collections / fields / relations). Directus re-applies it on container start.     |
| `scripts/build-schema.ts`         | Idempotently builds the data model against a running Directus via the API, then snapshot it.      |
| `scripts/setup-access.ts`         | Creates the Public policy, the Frontend role + a read-only **static token**, and the Editor role. |
| `seed/seed.ts`                    | Idempotent **demo** content (upsert-by-slug + singleton patch + O2M reset; imports images).       |
| `scripts/migrate-from-payload.ts` | One-time cutover tool: pulls the **real** Payload export into Directus.                           |
| `extensions/`                     | Mount point for Directus extensions (empty for now).                                              |

There is **no build step** — `turbo run build` skips this package. Everything
here is run on demand with **Bun** (see the repo `AGENTS.md` — never npm/yarn/pnpm).

Runs on **<http://localhost:8055>** in development (the web app is on `:3000`).

## Prerequisites

- **Bun** (package manager / runner).
- A running Directus instance to point the scripts at (locally via Docker, below).

## Run Directus locally

Directus and its Postgres `directus` database come up via the repo-root compose file:

```bash
# from the repo root
docker compose -f docker-compose.local.yml up -d postgres cms
```

On start the container runs `directus bootstrap` (creates tables + the admin user
from `ADMIN_EMAIL`/`ADMIN_PASSWORD`) and `directus schema apply` (re-applies
`snapshots/snapshot.yaml`). Open <http://localhost:8055> and log in.

> The Postgres init script only creates databases on a **fresh** volume. On an
> existing volume, create the `directus` database by hand once (see `DEPLOY.md`).

## Environment

The scripts read a running Directus URL + admin credentials. Copy and fill:

```bash
cp .env.example .env
```

| Variable                  | Purpose                                                               |
| ------------------------- | --------------------------------------------------------------------- |
| `DIRECTUS_PUBLIC_URL`     | Base URL of the running Directus to act on (`http://localhost:8055`). |
| `DIRECTUS_ADMIN_EMAIL`    | Admin login (matches the instance's bootstrap admin).                 |
| `DIRECTUS_ADMIN_PASSWORD` | Admin password.                                                       |

## Common tasks

```bash
bun run build-schema           # (re)build the data model, then snapshot it
bun run setup-access           # create Public/Editor access + print DIRECTUS_STATIC_TOKEN
bun run seed                   # load idempotent DEMO content
bun run check-types            # type-check the scripts
```

### Snapshot the data model after a change

Edit the model in Studio (or via `build-schema`), then snapshot it from inside the
running container so the committed YAML stays the source of truth:

```bash
docker exec <cms-container> npx directus schema snapshot --yes /directus/snapshots/snapshot.yaml
```

Commit the updated `snapshots/snapshot.yaml`. On the next deploy the container
re-applies it automatically (`directus schema apply`).

### Carry real prod content over (cutover only)

`seed/seed.ts` loads DEMO data. To migrate the live, editor-curated Payload
content into Directus at cutover, use `scripts/migrate-from-payload.ts` — see
[`docs/payload-to-directus-migration/prod-data-migration.md`](../../docs/payload-to-directus-migration/prod-data-migration.md).

## Access model (free-tier note)

Directus's free tier does not allow custom permission **rules** (item filters /
field-subset restrictions). So the Public policy grants full read access, and
**"published-only" visibility is enforced at query time in the frontend**
(`apps/web/src/data.ts` filters `status = published`), not at the permission
layer. `setup-access.ts` reflects this.
