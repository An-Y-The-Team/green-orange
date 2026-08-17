# crm-api — CRM backend (FastAPI + SQLModel)

The Python implementation of the CRM **v2** contract: the GreenOrange công trình
flow (request → quote → contract → paperwork → execution → acceptance →
settlement → closed) plus quotes, contracts, receivables, crew and timekeeping.

> **Twin of `apps/crm-api-nest`.** The NestJS + Prisma backend on `:8001` and this
> one on `:8000` implement the **same** endpoints, payloads and rules, so
> `apps/crm-web` works pointed at either (`CRM_API_URL`). NestJS remains the
> production default; this app is the teaching/sandbox implementation of the same
> contract. **When you change behaviour in one, change it in the other** — every
> module here names its NestJS counterpart in its docstring.

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
cp .env.example .env             # defaults match the docker-compose Postgres
uv sync                          # create .venv + install deps
uv run alembic upgrade head      # create the schema
uv run python -m app.seed        # demo user + reference data + a few công trình

uv run uvicorn app.main:app --reload --port 8000
```

Open <http://localhost:8000/docs>. From the monorepo root: `turbo run dev` (starts
every app) or `bun --filter @yan/crm-api dev`.

To see it drive the UI, point crm-web at it: `CRM_API_URL=http://localhost:8000`
in `apps/crm-web/.env.local`.

## Logging in (local auth)

The seed creates **`admin` / `admin`**.

```bash
# get a token
curl -s -X POST http://localhost:8000/auth/token \
  -d "username=admin&password=admin" | tee /tmp/tok.json

# call a protected endpoint
TOKEN=$(python -c "import json;print(json.load(open('/tmp/tok.json'))['access_token'])")
curl -s http://localhost:8000/clients -H "Authorization: Bearer $TOKEN"
```

In `/docs`, click **Authorize** and enter `admin` / `admin`.

## Tests

```bash
uv run pytest -q     # in-memory SQLite, no Postgres needed
uv run ruff check .  # lint (also `turbo run lint`)
```

The suite covers the parts that carry rules rather than every endpoint: the money
math, the state machines (quote versions, settlement sign/un-sign, bill and đợt
transitions), the closed-project lock, the referential guards and the derived
fields (`is_latest`, overdue, the chấm công summary).

## The contract, in one screen

- **snake_case** field names, emitted verbatim — no mapping layer in crm-web.
- **Money** is an integer number of VND on a `BIGINT` column (it overflows int32).
- **Dates** follow the column name: `*_date` is a `date` → `"YYYY-MM-DD"`, `*_at`
  is a timezone-aware `datetime` → full ISO. Python's native types give this for
  free; the NestJS side needs an interceptor for the same result.
- **Enum-like** columns are plain strings, constrained in the request schemas.
  Values are English; Vietnamese lives only in crm-web's labels.
- **Lists** are bounded (`?limit=`/`?offset=`, capped) and answer with the total
  row count in the `X-Total-Count` header. Filters accept comma-separated values
  (`?stage=quote,contract`); `?search=` is a case-insensitive substring match.
- **Derived, never stored**: a quote's `is_latest`, "overdue" on hồ sơ and đợt
  thanh toán (`?overdue=true`), the timekeeping summary.
- **Stages are soft**: doing the work advances the công trình (a quote drafted →
  `quote`, a cọc paid → `paperwork`, a settlement started → `settlement`). A
  `closed` công trình is locked; reopen it with `stage: settlement` first.

Deliberate differences from the NestJS twin, both framework-level: an invalid
request **body** answers 422 (FastAPI's validation error) where Nest answers 400,
and error bodies are FastAPI's `{"detail": …}`.

## Auth modes

- `AUTH_MODE=local` (default) — username/password → local HS256 JWT.
- `AUTH_MODE=oidc` — validate access tokens issued by self-hosted **Authentik**
  (`app/core/security.verify_oidc_token`: RS256 against Authentik's JWKS, `iss`
  and `aud` checks) with provision-on-first-login in `app/api/deps`. Plan:
  [`docs/authentik-oidc-milestone.md`](../../docs/authentik-oidc-milestone.md).

## Layout

```text
app/
  main.py            FastAPI app, CORS, router includes, integrity-error handler
  core/
    config.py        settings (pydantic-settings)
    db.py            engine + get_session dependency
    security.py      password hashing, local JWT, OIDC verification
    rules.py         stage machine, closed-project lock, document codes, today
  api/
    deps.py          SessionDep, CurrentUser
    common.py        page bounds, X-Total-Count, search/sort helpers
    routes/          auth, clients, projects, quotes, contracts, company,
                     paperwork, receivables, crew
  models/            one module per area; tables + request + response schemas
  seed.py            demo user, reference data, a few demo công trình
alembic/             migration environment
tests/               pytest suite (SQLite)
```

Each `models/*.py` holds its tables, its request schemas and its response
schemas together, so one file shows a resource's whole shape.
