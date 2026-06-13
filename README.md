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
  NEXT_PUBLIC_API_URL=http://localhost:8000
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
