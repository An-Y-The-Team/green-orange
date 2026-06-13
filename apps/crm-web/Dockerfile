# syntax=docker/dockerfile:1
# Build context = repo root (Bun + Turbo monorepo).
#   docker build -f apps/crm-web/Dockerfile --build-arg NEXT_PUBLIC_API_URL=https://crm-api.example.com .

FROM oven/bun:1-debian AS pruner
WORKDIR /app
COPY . .
RUN bunx turbo prune @yan/crm-web --docker

FROM oven/bun:1-debian AS deps
WORKDIR /app
# Copy the pruned lockfile and package.json files
COPY --from=pruner /app/out/json/ .
RUN bun install --frozen-lockfile --no-verify

FROM oven/bun:1-debian AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# Copy only the source code needed for crm-web
COPY --from=pruner /app/out/full/ .
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
