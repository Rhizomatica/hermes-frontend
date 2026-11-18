# ── Stage 1: install all workspace dependencies ──────────────────────────────
FROM node:20.19-alpine AS deps
WORKDIR /repo

# Copy only manifests first so this layer is cached between code changes
COPY package.json package-lock.json ./
COPY apps/hermes-shell/package.json      ./apps/hermes-shell/
COPY apps/hermes-gps/package.json        ./apps/hermes-gps/
COPY apps/hermes-chat-final/package.json ./apps/hermes-chat-final/
COPY packages/api/package.json           ./packages/api/
COPY packages/config/package.json        ./packages/config/
COPY packages/shared-auth/package.json   ./packages/shared-auth/
COPY packages/tailwind-config/package.json ./packages/tailwind-config/
COPY packages/ui/package.json            ./packages/ui/
COPY packages/utils/package.json         ./packages/utils/

# --ignore-scripts skips the hermes-gps postinstall tile download;
# tiles are mounted as a volume at runtime instead.
RUN npm ci --ignore-scripts

# ── Stage 2: build one app via Turborepo ─────────────────────────────────────
FROM node:20.19-alpine AS builder

# Which workspace member to build, e.g. hermes-shell | hermes-gps
ARG APP

# Build-time inputs. Keep these station-independent: only app behaviour and the
# version stamp belong here. Cross-app URLs are derived at runtime.
ARG GIT_COMMIT_HASH=dev
ARG NEXT_PUBLIC_BASE_PATH=
ARG NEXT_PUBLIC_ENABLE_CHAT=false
ARG NEXT_PUBLIC_PMTILES_URL=/brazil.pmtiles
ARG NEXT_PUBLIC_APP_TIME_ZONE=UTC

WORKDIR /repo

COPY --from=deps /repo/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1 \
    GIT_COMMIT_HASH=${GIT_COMMIT_HASH} \
    NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH} \
    NEXT_PUBLIC_ENABLE_CHAT=${NEXT_PUBLIC_ENABLE_CHAT} \
    NEXT_PUBLIC_PMTILES_URL=${NEXT_PUBLIC_PMTILES_URL} \
    NEXT_PUBLIC_APP_TIME_ZONE=${NEXT_PUBLIC_APP_TIME_ZONE}

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

# ── Stage 4: shippable standalone artifact ───────────────────────────────────
# Exports only the files the station needs, with no base image or Node runtime.
# Extract next to the app directory as: apps/<app>/server.js + node_modules/.
FROM scratch AS artifact

ARG APP

COPY --from=builder /repo/apps/${APP}/.next/standalone/ /
COPY --from=builder /repo/apps/${APP}/.next/static/ /apps/${APP}/.next/static/
COPY --from=builder /repo/apps/${APP}/public/ /apps/${APP}/public/
