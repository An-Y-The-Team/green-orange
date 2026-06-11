# syntax=docker/dockerfile:1
# Build context = repo root (this is a Bun + Turbo monorepo).
#   docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_CMS_URL=https://cms.example.com .

FROM oven/bun:1-debian AS deps
WORKDIR /app
# Copy only manifests first for a cached install layer.
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/cms/package.json ./apps/cms/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN bun install --frozen-lockfile --no-verify

FROM oven/bun:1-debian AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* is inlined into the client bundle at build time, so the public
# CMS URL must be supplied here (not at runtime).
ARG NEXT_PUBLIC_CMS_URL
ENV NEXT_PUBLIC_CMS_URL=$NEXT_PUBLIC_CMS_URL
ENV NEXT_TELEMETRY_DISABLED=1
# Opt in to standalone output + monorepo tracing for the production build only
# (next.config keeps these off in dev to avoid a Turbopack scan hang).
ENV NEXT_OUTPUT_STANDALONE=1
RUN bunx turbo run build --filter=@yan-portf/web

# --- Runtime: minimal Node image running the standalone server -------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# With outputFileTracingRoot at the repo root, the standalone output preserves
# the apps/web/ nesting and bundles the hoisted node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
# (no apps/web/public directory exists, so nothing to copy there)

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
