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

<!-- END:nextjs-agent-rules -->
