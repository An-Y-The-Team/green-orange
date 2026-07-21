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
# Bring the whole built workspace (node_modules incl. the generated Prisma
# client + CLI, dist, and the prisma/ dir with migrations).
COPY --from=builder /app ./
WORKDIR /app/apps/crm-api-nest
EXPOSE 8001
ENV PORT=8001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
