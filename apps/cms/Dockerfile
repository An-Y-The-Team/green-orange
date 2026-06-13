# syntax=docker/dockerfile:1
# Build context = repo root (Bun + Turbo monorepo).
#   docker build -f apps/cms/Dockerfile .
#
# Unlike the web image this is NOT a standalone build: the container keeps full
# node_modules so the Payload CLI is available to run database migrations on
# startup. sharp is a native dep, so we stay on a glibc (debian) base.

FROM oven/bun:1-debian AS base
WORKDIR /app

# --- Prune: generate a sparse monorepo for just this app ---
FROM base AS pruner
RUN bun install -g turbo@^2
COPY . .
RUN turbo prune @yan-portf/cms --docker

# --- Builder: install deps then build (single stage to preserve symlinks) ---
FROM base AS builder
# First install dependencies (as they change less often)
COPY --from=pruner /app/out/json/ .
# Install with dev dependencies present — `next build` needs typescript etc.
RUN bun install --frozen-lockfile --no-verify
# Then copy source and build
COPY --from=pruner /app/out/full/ .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bunx turbo run build --filter=@yan-portf/cms

# --- Runtime ---------------------------------------------------------------
# Run on Node (not Bun): the Payload CLI loads the TS config/migrations via
# tsx's Node ESM loader, which is incompatible with Bun. glibc base matches the
# sharp binary built above (both debian/amd64).
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Bring over the installed deps, source (payload config + migrations) and build.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps/cms ./apps/cms

WORKDIR /app/apps/cms
EXPOSE 3001
ENV PORT=3001 HOSTNAME=0.0.0.0
# Apply pending migrations, then start the Payload/Next server. Binaries are
# hoisted to the monorepo-root node_modules/.bin and run via their node shebang.
CMD ["sh", "-c", "/app/node_modules/.bin/payload migrate && /app/node_modules/.bin/next start -p 3001 -H 0.0.0.0"]
