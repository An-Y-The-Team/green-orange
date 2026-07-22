<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Package manager: use Bun

This project uses **Bun** as its package manager and script runner (`bun.lock` is the source of truth — there is no `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`). Always use Bun, never npm/yarn/pnpm:

- **Install deps**: `bun install` (never `npm install` — it would create a competing `package-lock.json`)
- **Add / remove a package**: `bun add <pkg>` / `bun add -d <pkg>` (dev) / `bun remove <pkg>`
- **Run scripts**: `bun run <script>` or the shorthand `bun dev`, `bun build`, `bun start`, `bun lint`, `bun test`
- **Run a one-off binary**: `bunx <pkg>` instead of `npx <pkg>`

Commit the updated `bun.lock` whenever dependencies change. Do not introduce another package manager's lockfile.

## DO NOT RELY ON useEffect

Discourage the usage of useEffect anywhere in the application

## Python backend (`apps/crm-api`): use uv

`apps/crm-api` is a FastAPI teaching backend managed with **[uv](https://docs.astral.sh/uv/)** (`pyproject.toml` is the source of truth, `uv.lock` is committed). It's wired into Turbo via a thin `package.json`, so `turbo run dev|lint|check-types` includes it.

- **Install deps**: `uv sync` (from `apps/crm-api/`)
- **Add / remove**: `uv add <pkg>` / `uv add --dev <pkg>` / `uv remove <pkg>`
- **Run**: `uv run <cmd>` (e.g. `uv run uvicorn app.main:app --reload`, `uv run pytest`, `uv run ruff check .`, `uv run alembic ...`)
- Lint/format is **ruff** (`uv run ruff check . [--fix]`). See `apps/crm-api/README.md` for the full lab guide.

## Second CRM backend (`apps/crm-api-nest`): NestJS + Prisma — the production default

There are **two** CRM backends behind the same UI. `apps/crm-api-nest` (NestJS +
Prisma + Bun, port 8001) is a **drop-in replacement** for the Python `crm-api`: it
serves the identical HTTP contract but implements the **whole** UI (every page live),
so it's the **production** backend. `apps/crm-api` (Python, port 8000) is the
**learning sandbox** students build. Switching is one env var — `crm-web`'s
`CRM_API_URL` points at whichever (`:8001` NestJS / `:8000` Python). No UI changes.

- First-class Node/Turbo citizen: real `dev|build|lint|check-types|test` (no CI
  exclusion). Uses Prisma migrations (`prisma migrate deploy` runs on container start).
- Its **own** database `crm_nest` in the shared Postgres (Python's `crm` is untouched).
- Contract rules live in `src/common/serialize.interceptor.ts` (BigInt→number,
  Date→`YYYY-MM-DD`); money columns are `BigInt` (VND > int32). Auth mirrors crm-api
  (local HS256 / Authentik OIDC). See `apps/crm-api-nest/README.md` and
  `docs/tasks/00-choose-your-backend.md`; deploy notes in `DEPLOY.md` §6c.

<!-- END:nextjs-agent-rules -->

## Production access: VPS behind a VPN

Production (databases, services) is **not reachable from a developer's local machine**. The prod network sits behind a VPS that is only accessible over the VPN, and the VPN can only be joined from a specific authorized machine. This means:

- **Do not attempt to run scripts, schema applies, or seeds against prod from this machine** — connections will fail. Hand the commands to the operator to run from the authorized machine instead.
- The CMS is **Directus** (official image; config-as-code in `apps/cms`). Run DB/schema-affecting commands **on the VPS**, ideally inside the running Directus container where `DB_*` / `KEY` / `SECRET` are already set — this avoids copying prod secrets around. Typical ones:
  - **Apply the data model**: `docker exec <cms-container> npx directus schema apply --yes /directus/snapshots/snapshot.yaml` (also runs automatically on container start).
  - **Bootstrap / first admin**: handled by `directus bootstrap` on container start (from `ADMIN_EMAIL` / `ADMIN_PASSWORD`).
  - **Access control + seed**: from `apps/cms`, run `bun run setup-access` then `bun run seed` (or `bun run migrate-from-payload` for the real cutover content) pointed at the prod Directus URL with admin creds — the operator runs these from the authorized machine.
  - **Backups**: `docker exec <postgres-container> pg_dump -U "$POSTGRES_USER" directus > directus-$(date +%F).sql` (the `directus` DB, plus the uploads volume).

---

Codex will review your output once you are done
