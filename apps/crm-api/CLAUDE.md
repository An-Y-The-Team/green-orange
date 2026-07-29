# Python backend (`apps/crm-api`): use uv

`apps/crm-api` is a FastAPI teaching backend managed with **[uv](https://docs.astral.sh/uv/)** (`pyproject.toml` is the source of truth, `uv.lock` is committed). It's wired into Turbo via a thin `package.json`, so `turbo run dev|lint|check-types` includes it.

- **Install deps**: `uv sync` (from `apps/crm-api/`)
- **Add / remove**: `uv add <pkg>` / `uv add --dev <pkg>` / `uv remove <pkg>`
- **Run**: `uv run <cmd>` (e.g. `uv run uvicorn app.main:app --reload`, `uv run pytest`, `uv run ruff check .`, `uv run alembic ...`)
- Lint/format is **ruff** (`uv run ruff check . [--fix]`). See `apps/crm-api/README.md` for the full lab guide.
