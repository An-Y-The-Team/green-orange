# crm-api — Teaching CRM backend (FastAPI + SQLModel)

A small, deliberately-incomplete CRM API for learning backend development:
**CRUD, REST, validation, and authorization**. The `clients` resource is fully
worked as a reference; `contacts`, `leads`, `deals`, and `tasks` are skeletons
left for you to implement.

> **This backend implements the v1 contract, and `apps/crm-web` has moved to v2.**
> Setting `CRM_API_URL=http://localhost:8000` does **not** light the UI up: the
> endpoint set and the field shapes both diverged, and a failing list read degrades
> to `[]`, so you get **empty pages with no error** rather than your data. (There is
> no mock/offline mode either — `CRM_API_URL` is required, and the UI's dev dataset
> comes from `apps/crm-api-nest`'s `bun run seed`.) `apps/crm-api-nest` on `:8001` is
> the backend that serves the current UI.
>
> Building the v1 contract **is** the exercise — the divergence changes only how you
> check your work. Your feedback loop is Swagger (<http://localhost:8000/docs>) plus
> `uv run pytest`, never a crm-web page. See
> [`docs/tasks/00-choose-your-backend.md`](../../docs/tasks/00-choose-your-backend.md).

## Stack

- [FastAPI](https://fastapi.tiangolo.com/) — web framework + automatic `/docs`
- [SQLModel](https://sqlmodel.tiangolo.com/) — models + Pydantic schemas over SQLAlchemy
- PostgreSQL — the `crm` database from the repo's `docker-compose.yml`
- [Alembic](https://alembic.sqlalchemy.org/) — migrations
- PyJWT + [pwdlib](https://frankie567.github.io/pwdlib/) (argon2) — local auth
- [uv](https://docs.astral.sh/uv/) — Python package/venv manager

## Setup

```bash
# from the repo root: start Postgres (creates the `crm` database)
docker compose up -d postgres

cd apps/crm-api
cp .env.example .env          # defaults match the docker-compose Postgres
uv sync                       # create .venv + install deps

# create the schema. Either:
uv run alembic revision --autogenerate -m "initial"   # generate a migration
uv run alembic upgrade head                            # apply it
# (or just start the app — it create_all()s tables on startup for convenience)

uv run uvicorn app.main:app --reload --port 8000
```

Open <http://localhost:8000/docs>. From the monorepo root you can also run it via
Turbo: `turbo run dev` (starts every app), or `bun --filter @yan/crm-api dev`.

## Logging in (local auth)

A demo user is seeded on first start: **`admin` / `admin`**.

```bash
# get a token
curl -s -X POST http://localhost:8000/auth/token \
  -d "username=admin&password=admin" | tee /tmp/tok.json

# call a protected endpoint
TOKEN=$(python -c "import json;print(json.load(open('/tmp/tok.json'))['access_token'])")
curl -s http://localhost:8000/clients -H "Authorization: Bearer $TOKEN"
```

In `/docs`, click **Authorize** and enter `admin` / `admin` to call protected
routes from the browser.

## Tests

```bash
uv run pytest -q     # uses in-memory SQLite, no Postgres needed
```

## Your exercises

`clients` is done. Implement the rest by following the same pattern
(`app/models/client.py` + `app/api/routes/clients.py`):

1. **Contacts** — `app/models/contact.py` + `app/api/routes/contacts.py`
2. **Leads** — `app/models/lead.py` + `app/api/routes/leads.py`
3. **Deals** — `app/models/deal.py` + `app/api/routes/deals.py`
4. **Tasks** — `app/models/task.py` + `app/api/routes/tasks.py`

For each: define the model + Create/Public/Update schemas, register it in
`app/models/__init__.py`, replace the `501` stub route with real CRUD handlers
(protect them with `CurrentUser`), generate + apply a migration, then check the
round-trip in `/docs` and cover it with a test.

The **field tables in [`docs/tasks/`](../../docs/tasks/README.md) are the contract**
for each resource, and the `*Public` models already in `app/models/` are the shape to
copy. (These tables used to be checked against `apps/crm-web/src/types/index.ts`;
that file is gone, and crm-web's per-feature `types.ts` files describe v2 — don't
match against them.)

## Auth modes

- `AUTH_MODE=local` (default) — username/password → local HS256 JWT. Implemented.
- `AUTH_MODE=oidc` — validate access tokens issued by self-hosted **Authentik**.
  Implemented in `app/core/security.verify_oidc_token` (RS256 verification against
  Authentik's JWKS, `iss`/`aud` checks) and `app/api/deps.get_current_user`
  (provision-on-first-login). The full execution plan (opt-in Authentik compose,
  JWKS verification, crm-web login via Auth.js) lives in
  [`docs/authentik-oidc-milestone.md`](../../docs/authentik-oidc-milestone.md).

## Layout

```text
app/
  main.py            FastAPI app, CORS, router includes, lifespan
  core/
    config.py        settings (pydantic-settings)
    db.py            engine + get_session dependency
    security.py      password hashing, local JWT, OIDC verification
  api/
    deps.py          SessionDep, CurrentUser
    routes/          auth.py, clients.py (worked) + *.py (exercises)
  models/            client.py, user.py (worked) + *.py (exercise skeletons)
  seed.py            demo user + sample clients
alembic/             migration environment
tests/               worked pytest example for clients
```
