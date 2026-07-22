# crm-api-nest — NestJS CRM backend (production default)

A **NestJS + Prisma** backend that is a **drop-in replacement** for the Python
`apps/crm-api`. It serves the exact same HTTP contract `apps/crm-web` expects, so
switching between the two backends is a one-line env change — no UI changes.

- **This backend (NestJS)** = the _production_ backend. It implements the **whole**
  UI contract, so every dashboard page shows live data.
- **`apps/crm-api` (Python/FastAPI)** = the _teaching sandbox_ students build. It
  implements only part of the contract; the rest falls back to mock data.

Both can run at once. Point crm-web at whichever you want via `CRM_API_URL`.

## Why it exists

`apps/crm-web` funnels every backend call through one server-side seam
(`apps/crm-web/src/lib/http.ts`) keyed on `CRM_API_URL`:

| `CRM_API_URL`           | crm-web talks to            | Result                               |
| ----------------------- | --------------------------- | ------------------------------------ |
| unset                   | — (bundled mock data)       | demo mode                            |
| `http://localhost:8001` | **crm-api-nest** (this app) | full production mode, all pages live |
| `http://localhost:8000` | crm-api (Python)            | teaching sandbox; unbuilt pages mock |

## Run it (local dev)

```bash
# 1. Start Postgres (creates the crm_nest DB on first boot)
docker compose up -d postgres

# 2. From this dir: install is done at the repo root (`bun install`).
cd apps/crm-api-nest
cp .env.example .env                 # DATABASE_URL points at crm_nest, AUTH_MODE=local

# 3. Apply the schema + seed the demo user (admin/admin) and a little data
bun run db:migrate:dev               # prisma migrate dev
bun run seed

# 4. Start it (port 8001)
bun run dev
```

Or from the repo root, `turbo run dev` starts crm-web (3002), crm-api (8000) **and**
crm-api-nest (8001) together.

Smoke test:

```bash
curl -s http://localhost:8001/health
# {"status":"ok","auth_mode":"local"}

curl -s -X POST http://localhost:8001/auth/token \
  -d "username=admin&password=admin"
# {"access_token":"…","token_type":"bearer"}
```

## Switch crm-web to this backend

In `apps/crm-web/.env`:

```bash
CRM_API_URL=http://localhost:8001   # NestJS (production mode — everything live)
# CRM_API_URL=http://localhost:8000 # Python (teaching sandbox — switch back here)
```

Restart crm-web. The dashboard header badge flips to **"Dữ liệu trực tiếp (API)"**.

## The contract

snake_case JSON · integer VND · `YYYY-MM-DD` dates · records cross-reference by
string `code` (`CT-2026-001`, `BG-…`, `HD-…`). The server assigns `id`, `code`,
`created_at`, and defaults (`stage=yeu_cau`, `progress=0`, `paid_amount=0`,
`status`) on create. Source of truth: the crm-web feature files
(`apps/crm-web/src/app/(dashboard)/<feature>/{types,enums,schema}.ts`).

Resources: `auth`, `health`, `clients`, `projects` (+ `costs`, `acceptances`),
`quotes`, `contracts` (+ `contract-templates`), `crew` (+ `assignments`),
`payment-milestones`, `tasks`, `leads`, `deals`.

Two serialization rules live in one place — `src/common/serialize.interceptor.ts`
(BigInt → JSON number, Date → `YYYY-MM-DD`). Money columns are `BigInt` because
VND values routinely exceed a 32-bit int.

## Auth

`AUTH_MODE=local` (dev): `POST /auth/token` argon2-verifies the seeded user and
mints an HS256 JWT. `AUTH_MODE=oidc` (prod): validates Authentik-issued RS256
tokens against the issuer JWKS and provisions the user on first login — the same
token crm-web already forwards. Every route needs `Authorization: Bearer …`
except `/health` and `/auth/token`.

## Tests

`bun run test` runs the contract-critical pure logic (code formatting,
BigInt/Date serialization, the milestone acceptance-gate). The full HTTP roundtrip
is the curl smoke above (needs a running DB).

## Database

Its own `crm_nest` database in the shared Postgres container (Python's `crm` is
untouched). Schema is owned by Prisma migrations in `prisma/migrations`; the
container entrypoint runs `prisma migrate deploy` on start.
