# syntax=docker/dockerfile:1
# Build context = repo root (Bun + Turbo monorepo).
#   docker build -f apps/crm-api-nest/Dockerfile .
# Internal-only service. Runs `prisma migrate deploy` then the Nest server on
# start, mirroring crm-api's migrate-on-start.

FROM oven/bun:1-debian AS base
WORKDIR /app

# --- Prune: sparse monorepo for just this app ---
FROM base AS pruner
RUN bun install -g turbo@^2
COPY . .
RUN turbo prune @yan/crm-api-nest --docker

# --- Builder: install deps, generate Prisma client, compile ---
FROM base AS builder
COPY --from=pruner /app/out/json/ .
RUN bun install --no-verify
COPY --from=pruner /app/out/full/ .
# `build` = `prisma generate && nest build` (schema is present now).
RUN bunx turbo run build --filter=@yan/crm-api-nest

# --- Runtime: Node running the compiled server ---
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Prisma needs libssl present to detect the engine target; the slim image omits
# it, so Prisma misdetects openssl-1.1.x and can't find the 3.0.x engine.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
# Bring the whole built workspace (node_modules incl. the generated Prisma
# client + CLI, dist, and the prisma/ dir with migrations).
COPY --from=builder /app ./
WORKDIR /app/apps/crm-api-nest
EXPOSE 8001
ENV PORT=8001
# Runs the Prisma CLI that `bun install` locked (6.x), resolved the way `require`
# would — so it works wherever Bun hoisted the package, and THROWS if it is
# missing from the image.
#
# Never `npx prisma`: npx silently falls back to fetching `latest` when the local
# binary is absent, and npm's `latest` is now Prisma 8. That would apply a
# major-version-newer CLI to a v6 schema on container start, failing with
# "datasource property `url` is no longer supported" — a crash loop caused by a
# network fetch, on a schema nobody touched. Not `bunx` either: this runtime
# stage is node:22-slim and has no bun (see the base stage above).
CMD ["sh", "-c", "node \"$(node -p \"require.resolve('prisma/build/index.js')\")\" migrate deploy && node dist/main"]
