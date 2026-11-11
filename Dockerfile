# ── Stage 1: install all workspace dependencies ──────────────────────────────
FROM node:20.19-alpine AS deps
WORKDIR /repo

# Copy only manifests first so this layer is cached between code changes
COPY package.json package-lock.json ./
COPY apps/hermes-chat/package.json  ./apps/hermes-chat/
COPY apps/hermes-gps/package.json   ./apps/hermes-gps/
COPY packages/api/package.json          ./packages/api/
COPY packages/tailwind-config/package.json ./packages/tailwind-config/
COPY packages/ui/package.json           ./packages/ui/

# --ignore-scripts skips the hermes-gps postinstall tile download;
# tiles are mounted as a volume at runtime instead.
RUN npm ci --ignore-scripts

# ── Stage 2: build one app via Turborepo ─────────────────────────────────────
FROM node:20.19-alpine AS builder

# Which workspace member to build, e.g. hermes-chat | hermes-gps | hermes-map
ARG APP

WORKDIR /repo

COPY --from=deps /repo/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npx turbo build --filter=${APP}

# ── Stage 3: minimal production image ────────────────────────────────────────
FROM node:20.19-alpine AS runner

ARG APP
ARG PORT=3000

# Make APP available at runtime so CMD can reference it
ENV APP=${APP} \
    PORT=${PORT} \
    HOSTNAME=0.0.0.0 \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

WORKDIR /app

# Standalone output — includes a trimmed node_modules with only runtime deps
COPY --from=builder --chown=nextjs:nodejs /repo/apps/${APP}/.next/standalone ./
# Static assets (JS chunks, CSS, images) — not included in standalone
COPY --from=builder --chown=nextjs:nodejs /repo/apps/${APP}/.next/static     ./apps/${APP}/.next/static
# Public folder (pmtiles files are excluded via .dockerignore; mount them at runtime)
COPY --from=builder --chown=nextjs:nodejs /repo/apps/${APP}/public           ./apps/${APP}/public

USER nextjs

EXPOSE ${PORT}

# server.js reads PORT and HOSTNAME from environment automatically
CMD sh -c "exec node apps/$APP/server.js"
