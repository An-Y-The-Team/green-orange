# GreenOrange Services - Portfolio & CMS

This is a full-stack monorepo for **GreenOrange Services** (Vệ Sinh & Thi Công Cửa Hàng). It contains both the public-facing landing page and the internal Content Management System.

## 🏗️ Project Structure

This project uses **Turborepo** to manage multiple applications in a single repository:

- `apps/web`: The Next.js 16 frontend landing page and portfolio. Built with React Server Components, Tailwind CSS, and standard UI components.
- `apps/cms`: The Payload CMS backend, providing a headless content management interface to manage services, projects, and testimonials.
- `apps/crm-web`: A Next.js 16 CRM dashboard. Runs on built-in mock data by default; switches to live data when pointed at `crm-api`.
- `apps/crm-api`: A FastAPI + SQLModel backend. `customers` is fully worked; `contacts`/`leads`/`deals`/`tasks` are exercises for students to implement.
- `packages/ui` (`@yan/ui`): Shared shadcn + Tailwind v4 UI primitives consumed by both `web` and `crm-web`.

> **Working on the CRM?** Jump to [Running just the CRM stack](#running-just-the-crm-stack) — you do **not** need `web` or `cms`.

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

To start both the Web frontend and the CMS backend concurrently, run:

```bash
bun run dev
```

This uses Turborepo to start the development servers:

- **Web App**: <http://localhost:3000>
- **CMS Admin**: <http://localhost:3001>

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

Add `-d` to run detached. The CMS and crm-api apply their database migrations
automatically on startup. Once it's up:

| Service    | URL                           | Notes                                    |
| ---------- | ----------------------------- | ---------------------------------------- |
| `web`      | <http://localhost:3000>       | Public landing page / portfolio          |
| `cms`      | <http://localhost:3001/admin> | Payload admin (create the first user)    |
| `crm-web`  | <http://localhost:3002>       | CRM dashboard — **mock data** by default |
| `crm-api`  | <http://localhost:8000/docs>  | FastAPI Swagger UI (`admin` / `admin`)   |
| `postgres` | `localhost:5432`              | `cms`, `crm`, `authentik` databases      |

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

# CRM dashboard only (mock data — no backend needed):
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

> **`crm-web` live mode:** by default the dashboard ships with built-in mock data
> so it runs with no backend. To point it at the live `crm-api`, add a runtime
> `CRM_API_URL: http://localhost:8000` env var (server-only, read at runtime — no
> rebuild) and a server-only `CRM_API_TOKEN` to the `crm-web` service in
> [`docker-compose.local.yml`](docker-compose.local.yml) — the file has inline
> notes showing how.
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
[Authentik SSO](#5-optional-authentik-sso) below and
[`docs/authentik-oidc-milestone.md`](docs/authentik-oidc-milestone.md). The
secret/bootstrap values default to throwaway local-dev strings; the prod stack
([`docker-compose.prod.yml`](docker-compose.prod.yml)) requires real ones.

## 🧑‍🎓 Running just the CRM stack

If you're working on the **CRM** only, you only need three
things — **Postgres**, **crm-api** (FastAPI backend), and **crm-web** (Next.js UI).
You can ignore `web` and `cms` entirely. Authentik (SSO) is **optional** and not
needed for day-to-day CRUD/API work.

### CRM prerequisites

- [Bun](https://bun.sh/) — JS package manager (for `crm-web`)
- [Docker](https://www.docker.com/) — runs Postgres
- [uv](https://docs.astral.sh/uv/) — Python package manager (for `crm-api`)

### 1. Install JS dependencies (from the repo root)

```bash
bun install
```

### 2. Start Postgres

One container hosts the `cms`, `crm`, and `authentik` databases. You only need it
running — the `crm` database is created automatically.

```bash
docker compose up -d postgres
```

### 3. Start the backend — `crm-api` (port 8000)

```bash
cd apps/crm-api
cp .env.example .env     # defaults already match the Docker Postgres
uv sync                  # create .venv + install deps
uv run uvicorn app.main:app --reload --port 8000
```

The schema is auto-created on startup, and a demo user **`admin` / `admin`** is
seeded. Open the interactive docs at <http://localhost:8000/docs>.

### 4. Start the frontend — `crm-web` (port 3002)

```bash
cd apps/crm-web
cp .env.example .env.local
```

Then choose one of two modes:

- **Mock mode (default):** leave `.env.local` as-is. The dashboard renders from
  built-in mock data — no backend needed. Good for pure UI work.
- **Live mode:** point the UI at the backend and give it a token:

  ```bash
  # in apps/crm-web/.env.local
  CRM_API_URL=http://localhost:8000
  # mint a dev token from the running crm-api:
  #   curl -s -X POST http://localhost:8000/auth/token -d "username=admin&password=admin"
  CRM_API_TOKEN=eyJhbG...   # paste the access_token here (server-only, never sent to the browser)
  ```

Run it (from the repo root, so it doesn't also start `web`/`cms`):

```bash
bun --filter @yan/crm-web dev
```

Open <http://localhost:3002>.

> **Run both CRM apps at once:** from the repo root,
> `turbo run dev --filter=@yan/crm-web --filter=@yan/crm-api` starts only the CRM
> backend + frontend (not `web`/`cms`).

### 5. (Optional) Authentik SSO

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

The script prints the env to add to `apps/crm-api/.env` (`AUTH_MODE=oidc` + `OIDC_*`)
and `apps/crm-web/.env.local` (`AUTH_SECRET` + `AUTH_AUTHENTIK_*`). The Authentik UI
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
- **CMS**: Payload CMS
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Monorepo**: Turborepo
- **Package Manager**: Bun
- **Linting & Formatting**: ESLint 9 (Flat Config) & Prettier
