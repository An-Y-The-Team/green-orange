# syntax=docker/dockerfile:1
# Build context = repo root (Bun + Turbo monorepo).
#   docker build -f apps/crm-web/Dockerfile --build-arg NEXT_PUBLIC_API_URL=https://crm-api.example.com .

FROM oven/bun:1-debian AS deps
WORKDIR /app
# Copy only manifests first for a cached install layer.
COPY package.json bun.lock ./
COPY apps/crm-web/package.json ./apps/crm-web/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/cms/package.json ./apps/cms/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/ui/package.json ./packages/ui/package.json
RUN bun install --frozen-lockfile --no-verify

FROM oven/bun:1-debian AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* is inlined into the client bundle at build time.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
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
