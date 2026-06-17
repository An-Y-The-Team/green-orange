# [Basics] Set up your environment & run the API

> **Labels:** `area:backend` · `setup` · `good first issue` · `difficulty:easy`
> **Depends on:** nothing — start here.
> **Good for:** every student (do it on your own machine).

## Background

`crm-api` is a FastAPI backend managed with **uv** (the Python package manager) and
backed by the **`crm`** Postgres database that the repo's `docker-compose.yml`
provisions. Before writing any code you need it running locally and serving its
interactive docs. No Authentik / SSO is involved — the daily loop is plain local
auth.

## What you'll learn

- How this project's Python toolchain works (`uv sync`, `uv run`)
- How the app gets its database (Docker Postgres + `DATABASE_URL`)
- Where the auto-generated API docs live (`/docs`)

## Task

1. **Start Postgres** (from the repo root). This creates the `crm` database:

   ```bash
   docker compose up -d postgres
   ```

2. **Install dependencies** (from `apps/crm-api/`):

   ```bash
   cd apps/crm-api
   cp .env.example .env      # defaults already match the docker-compose Postgres
   uv sync                   # creates .venv and installs everything
   ```

3. **Run the API**:

   ```bash
   uv run uvicorn app.main:app --reload --port 8000
   ```

   On first start the app creates the tables and seeds a demo user + sample
   customers (see [`app/main.py`](../../apps/crm-api/app/main.py) `lifespan`).

4. **Verify it's alive:**

   ```bash
   curl -s http://localhost:8000/health
   # -> {"status":"ok","auth_mode":"local"}
   ```

5. Open **<http://localhost:8000/docs>** in a browser and look at the route list.

## Acceptance criteria

- [ ] `docker compose up -d postgres` runs and the `postgres` container is healthy.
- [ ] `uv sync` completes without errors and a `.venv/` exists.
- [ ] `GET /health` returns `{"status":"ok","auth_mode":"local"}`.
- [ ] `/docs` loads and shows the `auth`, `customers`, `contacts`, `leads`, `deals`,
      and `tasks` route groups.

## Hints & references

- The defaults in [`.env.example`](../../apps/crm-api/.env.example) match the
  Docker Postgres — you usually don't need to edit anything.
- From the monorepo root you can also start everything with `turbo run dev`, or just
  this app with `bun --filter @yan/crm-api dev`.
- `uv run <cmd>` runs a command inside the project's virtual env — you never
  `pip install` or `activate` manually.

## Definition of done

The API runs locally, `/health` is green, and you can browse `/docs`.
Next: [02 — Log in & call a protected endpoint](02-auth-and-protected-endpoints.md).
</content>
