# syntax=docker/dockerfile:1
# Build context = repo root (Bun + Turbo monorepo).
#   docker build -f apps/crm-web/Dockerfile .
# The backend URL (CRM_API_URL) is read at RUNTIME, not baked in — point the
# image at a backend by passing it as a container env var, no rebuild needed.

FROM oven/bun:1-debian AS base
WORKDIR /app

# --- Prune: generate a sparse monorepo for just this app ---
FROM base AS pruner
RUN bun install -g turbo@^2
COPY . .
RUN turbo prune @yan/crm-web --docker

# --- Builder: install deps then build (single stage to preserve symlinks) ---
FROM base AS builder
# First install dependencies (as they change less often)
COPY --from=pruner /app/out/json/ .
RUN bun install --no-verify
# Then copy source and build
COPY --from=pruner /app/out/full/ .
# CRM_API_URL is server-only and read at runtime, so nothing about the backend
# is baked into the build — the same image works against any backend.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT_STANDALONE=1
RUN bunx turbo run build --filter=@yan/crm-web

# --- Runtime: minimal Node image running the standalone server -------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/crm-web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/crm-web/.next/static ./apps/crm-web/.next/static

USER nextjs
EXPOSE 3002
ENV PORT=3002 HOSTNAME=0.0.0.0
CMD ["node", "apps/crm-web/server.js"]
