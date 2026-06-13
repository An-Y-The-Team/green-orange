# syntax=docker/dockerfile:1
# Build context = apps/crm-api (self-contained Python app).
#   docker build -f apps/crm-api/Dockerfile apps/crm-api

FROM python:3.12-slim AS base
# uv for fast, reproducible installs.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1

# Install dependencies first (cached layer) using only the manifests.
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-dev --frozen --no-install-project 2>/dev/null \
    || uv sync --no-dev --no-install-project

COPY . .

EXPOSE 8000
# Run migrations, then start the server (mirrors the CMS migrate-on-start flow).
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000"]
