# GreenOrange Services - Portfolio & CMS

This is a full-stack monorepo for **GreenOrange Services** (Vệ Sinh & Thi Công Cửa Hàng). It contains both the public-facing landing page and the internal Content Management System.

## 🏗️ Project Structure

This project uses **Turborepo** to manage multiple applications in a single repository:

- `apps/web`: The Next.js 16 frontend landing page and portfolio. Built with React Server Components, Tailwind CSS, and standard UI components.
- `apps/cms`: The **Directus** CMS backend (official Docker image + config-as-code in this folder), providing a headless content management interface — with a free, open-source Visual Editor — to manage services, projects, and testimonials.
- `apps/crm-web`: A Next.js 16 CRM dashboard. **Requires a backend and a seeded database** — it reads every page over HTTP from `CRM_API_URL`. See [Running just the CRM stack](#-running-just-the-crm-stack).
- `apps/crm-api-nest`: A NestJS + Prisma backend (Bun, port 8001) — the **production default** and the only backend `crm-web` speaks to. Also owns the demo dataset (`bun run seed`).
- `apps/crm-api`: A FastAPI + SQLModel backend (port 8000) — the **learning sandbox**. `clients` is fully worked; `contacts`/`leads`/`deals`/`tasks` are exercises for students to implement. It serves the **v1** contract, so it is not UI-compatible — verify it via `/docs` + `pytest`, not the dashboard ([AGENTS.md](AGENTS.md)).
- `packages/ui` (`@yan/ui`): Shared shadcn + Tailwind v4 UI primitives consumed by both `web` and `crm-web`.

> **Working on the CRM?** Jump to [Running just the CRM stack](#-running-just-the-crm-stack) — you do **not** need `web` or `cms`.

## 🚀 Getting Started

### Prerequisites

This project uses [Bun](https://bun.sh/) as its package manager and script runner.

### Installation

1. Clone the repository and install dependencies using Bun:

   ```bash
   bun install
   ```

2. (Optional) Set up any required environment variables. You may need to configure `.env.local` or `.env` inside `apps/cms` or `apps/web` for database connections and secret keys.

### Running Development Servers

The CMS is **Directus** (an official Docker image), so it does **not** run under
Turbo. Everyday dev is two commands — start the infra (Postgres + Directus) in
Docker, then run the front-end apps on the host with hot reload:

```bash
# 1. Postgres + Directus (CMS) — the green-orange-dev stack
docker compose up -d

# 2. Web + CRM on the host (Turbo skips the CMS — it's already in Docker)
bun run dev
```

| Service           | URL                     | Notes                                                                                                      |
| ----------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Web App**       | <http://localhost:3000> | hot reload via Turbo                                                                                       |
| **CMS (Studio)**  | <http://localhost:8055> | Directus — login `admin@example.com`/`admin`                                                               |
| **CRM dashboard** | <http://localhost:3002> | blank until its backend is migrated + seeded — [three more commands](#3-migrate-and-seed-the-crm-database) |

> **The CRM needs more than `bun run dev`.** `turbo run dev` does start
> `crm-api-nest` alongside it, but the dashboard has no offline mode: it needs a
> migrated + seeded `crm_nest` database and `CRM_API_URL` set. Do
> [Running just the CRM stack](#-running-just-the-crm-stack) once and everyday
> `bun run dev` works from then on.

> **First boot only** — once Directus is up, load access control + demo content
> (from `apps/cms`, against the running instance):
>
> ```bash
> cd apps/cms
> bun run setup-access   # prints DIRECTUS_STATIC_TOKEN= → paste into apps/web/.env
> bun run seed           # idempotent demo services/projects/testimonials
> ```
>
> Published reads work anonymously even without the token; it's needed for
> draft/preview. See [`apps/cms/README.md`](apps/cms/README.md) for the details.

## 🐳 Running the full stack in Docker (locally)

For day-to-day coding, `bun run dev` is faster (hot reload, no image builds). Use
this when you want to exercise the **production container images** on your own
machine — local builds of all four apps + Postgres, no GHCR pull and no VPS.
This is the local-build counterpart to [`docker-compose.prod.yml`](docker-compose.prod.yml)
(which pulls prebuilt images); the file lives at
[`docker-compose.local.yml`](docker-compose.local.yml).

> **Prerequisite:** [Docker](https://www.docker.com/) (with the Compose plugin).
> Nothing else — Bun/uv/Node all run inside the containers.

### Run everything

Build the images and start the whole stack (Postgres + CMS + web + crm-api + crm-web):

```bash
docker compose -f docker-compose.local.yml up --build
```

Add `-d` to run detached. Everything self-initialises on startup: Directus
bootstraps + applies its schema, crm-api applies its migrations, and
crm-api-nest migrates **and seeds** — so a fresh volume comes up with the demo
dataset already loaded. Once it's up:

| Service        | URL                          | Notes                                                               |
| -------------- | ---------------------------- | ------------------------------------------------------------------- |
| `web`          | <http://localhost:3000>      | Public landing page / portfolio                                     |
| `cms`          | <http://localhost:8055>      | Directus Studio (login with the bootstrap admin)                    |
| `crm-web`      | <http://localhost:3002>      | CRM dashboard — wired to `crm-api-nest`; seeded data, no setup step |
| `crm-api-nest` | <http://localhost:8001>      | NestJS + Prisma backend (`admin` / `admin`)                         |
| `crm-api`      | <http://localhost:8000/docs> | FastAPI Swagger UI (`admin` / `admin`)                              |
| `postgres`     | `localhost:5432`             | `directus`, `cms`, `crm`, `crm_nest`, `authentik` databases         |

Stop it with `Ctrl-C` (or `docker compose -f docker-compose.local.yml down` if
detached). Add `-v` to `down` to also wipe the Postgres + media volumes.

### Run a specific app only

Pass the service name(s) to `up`. Compose starts each target plus anything it
`depends_on` (e.g. `web` pulls in `cms`, and both pull in `postgres`):

```bash
# Just the CMS (and its Postgres):
docker compose -f docker-compose.local.yml up --build cms

# Public web app (also starts cms + postgres, which it depends on):
docker compose -f docker-compose.local.yml up --build web

# CRM backend only (and its Postgres):
docker compose -f docker-compose.local.yml up --build crm-api

# CRM dashboard (Compose pulls in crm-api-nest + postgres, which it needs):
docker compose -f docker-compose.local.yml up --build crm-web

# A custom combo — e.g. the whole CRM stack, nothing else:
docker compose -f docker-compose.local.yml up --build crm-api crm-web
```

Other handy per-service commands:

```bash
# Rebuild one image after a code change:
docker compose -f docker-compose.local.yml build web

# Tail logs for one service:
docker compose -f docker-compose.local.yml logs -f cms

# Open a shell inside a running container:
docker compose -f docker-compose.local.yml exec cms sh
```

> **The CRM seeds itself:** before starting the server the `crm-api-nest`
> container runs `prisma migrate deploy` **and** `node dist/seed.js`, so a fresh
> volume already has the demo user `admin`/`admin` and the whole dataset — no
> host-side step, no Bun outside Docker. The seed upserts on stable ids, so
> restarts converge instead of duplicating. This seed-on-start is a `command:`
> override that exists **only** in `docker-compose.local.yml`; prod uses the
> image's migrate-only `CMD` and never auto-seeds.
>
> ```bash
> # Re-seed after poking the data by hand:
> docker compose -f docker-compose.local.yml restart crm-api-nest
>
> # Changed src/seed.ts? The image ships the compiled copy, so rebuild:
> docker compose -f docker-compose.local.yml up --build -d crm-api-nest
> ```
>
> `CRM_API_URL` is already set on the `crm-web` service (to
> `http://crm-api-nest:8001`) and is **required** — there is no bundled-data
> fallback. It's read at runtime, so changing it needs no rebuild, but
> `crm-api-nest` is the only valid target.
>
> **One Postgres at a time:** this stack uses its own Postgres volume and binds
> host port `5432`, so don't run it at the same time as the `docker compose up
postgres` dev workflow below.

### Authentik SSO (opt-in)

The CRM's single-sign-on identity provider isn't needed for everyday CRUD/API
work, so its three services (`authentik-server`, `authentik-worker`,
`authentik-redis`) sit behind a Compose **profile** and **don't start** with a
plain `up`. They reuse the `authentik` database in the same `postgres` container.
To bring the whole stack up _with_ SSO:

```bash
docker compose -f docker-compose.local.yml --profile authentik up --build
```

Authentik applies its own schema migrations on first start. The UI is at
<http://localhost:9000> — log in as **`akadmin` / `admin`** (the local-dev
bootstrap default; override `AUTHENTIK_BOOTSTRAP_PASSWORD` to change it). To
actually wire the CRM apps to it, register the OIDC app with
`scripts/setup-authentik-crm.py` and flip `AUTH_MODE=oidc` — see
[Authentik SSO](#6-optional-authentik-sso) below and
[`docs/authentik-oidc-milestone.md`](docs/authentik-oidc-milestone.md). The
secret/bootstrap values default to throwaway local-dev strings; the prod stack
([`docker-compose.prod.yml`](docker-compose.prod.yml)) requires real ones.

## 🧑‍🎓 Running just the CRM stack

Working on the **CRM** only? You need three things — **Postgres**, the
**`crm-api-nest`** backend, and **`crm-web`** (the Next.js UI). You can ignore
`web` and `cms` entirely. Authentik (SSO) is **optional** and not needed for
day-to-day work.

> **No offline UI mode.** `crm-web` fetches every page from the backend — there
> is no bundled fixture set to fall back on, so even pure CSS work needs Postgres
> running and the `crm_nest` database seeded. That's the five steps below, and
> steps 1–3 are once per machine.

> **`crm-api-nest` is the only backend that serves this UI.** The Python
> `crm-api` is the students' v1 sandbox and is not UI-compatible — see
> [AGENTS.md](AGENTS.md) and
> [`apps/crm-api-nest/README.md`](apps/crm-api-nest/README.md).

### CRM prerequisites

- [Bun](https://bun.sh/) — package manager + runtime for `crm-web` and `crm-api-nest`
- [Docker](https://www.docker.com/) — runs Postgres
- [uv](https://docs.astral.sh/uv/) — only if you're also doing the Python
  `crm-api` exercises

### 1. Install dependencies (from the repo root)

```bash
bun install
```

`crm-api-nest`'s `postinstall` generates its Prisma client here, so this must run
before the backend does.

### 2. Start Postgres

One container hosts a database per app — `cms`, `crm`, `crm_nest`, `authentik`,
`directus`, all created on first boot. Nothing else from the dev stack is needed.

```bash
docker compose up -d postgres
```

### 3. Migrate and seed the CRM database

Creates the `crm_nest` schema, then loads the demo dataset the UI was built
against: **9 công trình — one per lifecycle stage, plus a parked one** — with
quotes (including a superseded pair and a standalone quote with no công trình),
contracts, a signed settlement with a collected bill, payment milestones (one
overdue), crew with a double-booked member, timekeeping, paperwork (one overdue),
attachments, notes, an appointment that is always **today**, and a follow-up
that is always **due**. Plus the backend user **`admin` / `admin`** — `crm-web` mints its token
with it automatically, so there's no login screen unless you enable Authentik.

```bash
cd apps/crm-api-nest
cp .env.example .env     # DATABASE_URL → localhost:5432/crm_nest, AUTH_MODE=local
bun run migrate          # prisma migrate deploy
bun run seed
```

The seed upserts on stable ids, so re-run it any time to get back to a known
dataset — it converges instead of duplicating. (Changing the Prisma schema?
`bun run db:migrate:dev` instead of `migrate`.)

### 4. Start the backend — `crm-api-nest` (port 8001)

```bash
cd apps/crm-api-nest
bun run dev
```

Smoke test: `curl -s http://localhost:8001/health` → `{"status":"ok","auth_mode":"local"}`.
Endpoint reference: [`apps/crm-api-nest/README.md`](apps/crm-api-nest/README.md).

### 5. Start the dashboard — `crm-web` (port 3002)

```bash
cd apps/crm-web
cp .env.example .env.local   # already contains CRM_API_URL=http://localhost:8001
```

`CRM_API_URL` is **required** — server-only, so it's never exposed to the
browser. No token to manage: in `AUTH_MODE=local` the UI auto-mints one from
`/auth/token` with the seeded `admin`/`admin` and re-mints when it expires.

Run it from the repo root, so `web`/`cms` stay out of it:

```bash
turbo run dev --filter=@yan/crm-web
```

Open <http://localhost:3002> — `/dashboard`, `/projects`, `/quotes`,
`/receivables` and the crew pages all show seeded data.

> **Both CRM apps at once:** from the repo root,
> `turbo run dev --filter=@yan/crm-web --filter=@yan/crm-api-nest` starts the CRM
> backend + frontend and nothing else.

### 6. (Optional) Authentik SSO

Only needed when you're working on single-sign-on. Daily CRUD/auth learning uses
the local `admin`/`admin` login above (`AUTH_MODE=local`). To turn on Authentik,
follow [`docs/authentik-oidc-milestone.md`](docs/authentik-oidc-milestone.md):

```bash
# Postgres must already be up (step 2 — it hosts the `authentik` database)
cp .env.authentik.example .env.authentik
echo "AUTHENTIK_SECRET_KEY=$(openssl rand -base64 60 | tr -d '\n')" >> .env.authentik
echo "AUTHENTIK_BOOTSTRAP_TOKEN=$(openssl rand -hex 32)"            >> .env.authentik
docker compose -f docker-compose.authentik.yml --env-file .env.authentik up -d
python3 scripts/setup-authentik-crm.py   # creates the crm-dev app, prints OIDC env to paste
```

The script prints the env to add to your backend's `.env` (`AUTH_MODE=oidc` +
`OIDC_*`) — `apps/crm-api-nest/.env`, or `apps/crm-api/.env` if that's the one
you're running — and to `apps/crm-web/.env.local` (`AUTH_SECRET` +
`AUTH_AUTHENTIK_*`). The Authentik UI
is at <http://localhost:9000> (log in as `akadmin`).

## 🛠️ Available Commands

From the root directory, you can run the following commands:

- `bun run dev`: Start all development servers.
- `bun run build`: Build all applications for production.
- `bun run lint`: Run ESLint across all workspaces.
- `bun run format`: Format all codebase files (`.js, .ts, .tsx, .md`) using Prettier.
- `bun run clean`: Clean up build artifacts (`.next`, `dist`, etc.) across all apps.

## 🎨 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **CMS**: Directus (self-hosted, official image)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Monorepo**: Turborepo
- **Package Manager**: Bun
- **Linting & Formatting**: ESLint 9 (Flat Config) & Prettier
