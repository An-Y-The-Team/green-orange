# @yan-portf/cms — Payload CMS

The headless content backend for GreenOrange Services. Manages services, projects,
testimonials, site settings, and captures contact-form leads. Built on **Payload 3**
and **Next.js 16**, backed by **PostgreSQL**, with the **Lexical** rich-text editor
and local file uploads.

Runs on **<http://localhost:3001>** in development (the web app is on `:3000`).

## Prerequisites

- **Bun** (package manager / runner — never npm/pnpm; see the repo `AGENTS.md`).
- A reachable **PostgreSQL** database. The repo ships a local one via Docker (below).

## Environment

Copy the example and fill it in:

```bash
cp .env.example .env
```

| Variable         | Purpose                                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`   | Postgres connection string, e.g. `postgres://postgres:password@127.0.0.1:5432/cms`                                           |
| `PAYLOAD_SECRET` | Secret used to sign/encrypt. Generate with `openssl rand -hex 32`.                                                           |
| `CMS_PUBLIC_URL` | Public origin of the CMS; sets Payload `serverURL` so uploaded media URLs are absolute. Defaults to `http://localhost:3001`. |
| `CORS_ORIGINS`   | Comma-separated browser origins allowed to call the API (the web contact form). Defaults to `http://localhost:3000`.         |

## Local database (Docker)

A Postgres service for local dev lives in the **repo-root** `docker-compose.yml`
(not in this folder). It creates a database per app — `cms` today, `crm` later —
via `init-multiple-databases.sh`.

```bash
# from the repo root
docker compose up -d postgres
```

> The init script only runs the first time the data volume is created. To add a
> database to an existing volume, create it manually or recreate the volume.

## Development

From the repo root (preferred — uses Turbo):

```bash
bun install
turbo run dev          # starts web (:3000) and cms (:3001)
```

Or just this app:

```bash
bun run dev            # next dev -p 3001
```

In dev, Payload pushes the schema to the database automatically. Open
<http://localhost:3001/admin> and follow the prompts to create the first admin user.

### Seed demo data

```bash
bun run seed           # idempotent upsert of services/projects/testimonials by slug
```

## Schema changes & migrations

Production applies committed migrations on startup (the Docker entrypoint runs
`payload migrate`). After changing collections/globals:

```bash
bun run generate:types                        # refresh src/payload-types.ts
bun run payload migrate:create <name>         # generate the delta migration (commit it)
```

Migrations live in `src/migrations/` and run in order against a fresh database.

## What's inside

- **Collections**: `users` (auth/admin), `media` (uploads), `services`, `projects`,
  `testimonials`, `contact-submissions` (public create, admin-only read — the leads inbox).
- **Globals**: `site-settings` (company info, stats, hero copy, SEO defaults).
- **Plugins**: `@payloadcms/plugin-seo` (per-page meta on services/projects).
- **API**: REST at `/api/*`, GraphQL at `/api/graphql`. The web app reads collections
  at `depth=0` and the `site-settings` global; see `apps/web/src/data.ts`.
