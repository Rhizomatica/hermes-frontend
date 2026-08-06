# ADR-007: Multi-App Deployment Architecture

**Status**: Accepted  
**Date**: 2026-08-06  
**Deciders**: Frontend Architect, Senior Project Manager

---

## Context

The Hermes frontend consists of three applications that share authentication. The **canonical deployment target is the sBitx** — a Raspberry Pi-based HF radio transceiver with all services running locally on `localhost` (fully air-gapped, no internet). The deployment architecture supports two modes:

1. **sBitx (primary)**: All apps + backend + daemon run on a single Raspberry Pi. nginx reverse proxy on `localhost` routes to all services. Chromium kiosk mode displays the UI on the 7-inch touchscreen.
2. **Generic (LAN)**: Apps deployed on a network-accessible server, accessed from companion tablets/phones over LAN. Same reverse-proxy pattern, but on a network-accessible hostname.

The Hermes frontend consists of three applications that share authentication:

| App | Purpose | Deployable Independently? |
|---|---|---|
| `hermes-shell` | Login page, app selector, navigation hub | ✅ |
| `hermes-gps-final` | GPS coordinate viewer with offline maps | ✅ |
| `hermes-chat-final` | Messaging client with offline support | ✅ |

Each app must be deployable independently (e.g., a station that only needs GPS can deploy just `hermes-gps-final`). But when multiple apps are deployed together, they must share a single login session — the user authenticates once and can navigate between apps without re-entering credentials.

## Decision

**We will use a reverse-proxy-based composition pattern with path-based routing for co-deployed apps, and standalone mode for independently deployed apps.**

### Co-Deployed Mode (Production, All Apps)

```
                    ┌──────────────────────────────────────────┐
                    │         nginx / caddy                     │
                    │     https://station.local                 │
                    │                                           │
                    │  /          → hermes-shell    :4000       │
                    │  /gps/*     → hermes-gps-final :4001      │
                    │  /chat/*    → hermes-chat-final :4002     │
                    │  /api/*     → hermes-backend   :8080      │
                    └──────────────────────────────────────────┘
```

- All apps served from **same origin** → cookies set on `Path=/` are shared
- Nginx strips path prefixes before forwarding (`/gps/page` → `:4001/page`)
- Each app configures `NEXT_PUBLIC_BASE_PATH` for correct asset URLs:
  - Shell: `NEXT_PUBLIC_BASE_PATH=` (empty — root)
  - GPS: `NEXT_PUBLIC_BASE_PATH=/gps`
  - Chat: `NEXT_PUBLIC_BASE_PATH=/chat`

### Standalone Mode (Single App)

```
                    ┌──────────────────────────────────────────┐
                    │         nginx / caddy                     │
                    │     https://station.local                 │
                    │                                           │
                    │  /      → hermes-gps-final  :4001         │
                    │  /api/* → hermes-backend    :8080         │
                    └──────────────────────────────────────────┘
```

- Single app at root — no path prefix
- `NEXT_PUBLIC_BASE_PATH=` (empty)
- Auth still works: the GPS app includes `AuthProvider` in its layout → redirects to its own login page if no token exists

### Auth Flow in Both Modes

The `@hermes/shared-auth` `AuthProvider` handles auth detection transparently:

```
App mounts
    │
    ▼
Check for existing token (cookie in co-deployed, localStorage in standalone-dev)
    │
┌───┴───┐
│ Valid │          │ No token / expired │
└───┬───┘          └────────┬──────────┘
    │                       │
 Render app           Is shell accessible?
                          │
                    ┌─────┴─────┐
                    │ Yes       │ No (standalone)
                    └─────┬─────┘
                          │           │
                    Redirect to  Show local
                    / (shell)    login page
```

### Navigation Between Apps (Co-Deployed)

The Shell app renders an app selector with links:

```tsx
// hermes-shell — AppSelector.tsx
<Link href="/gps">GPS Viewer</Link>
<Link href="/chat">Chat</Link>
```

Each sub-app includes a "Back to Hermes" button:

```tsx
// hermes-gps-final & hermes-chat-final — Navbar.tsx
<Link href="/">← Back to Hermes</Link>
```

Navigation triggers a full page load (different Next.js app), but the auth cookie persists, so the target app renders immediately without a login redirect.

### Base Path Configuration

Each app's `next.config.ts`:

```typescript
// apps/hermes-shell/next.config.ts
export default { basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '' };

// apps/hermes-gps-final/next.config.ts
export default { basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '' };

// apps/hermes-chat-final/next.config.ts
export default { basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '' };
```

Environment files:

```bash
# hermes-shell/.env.production
NEXT_PUBLIC_BASE_PATH=

# hermes-gps-final/.env.production
NEXT_PUBLIC_BASE_PATH=/gps

# hermes-chat-final/.env.production
NEXT_PUBLIC_BASE_PATH=/chat
```

### Docker Configuration

Each app has its own `Dockerfile`:

```dockerfile
# Generic Dockerfile for all apps
FROM node:22-alpine
WORKDIR /app
ARG APP_NAME
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/${APP_NAME} ./apps/${APP_NAME}
RUN npm ci --workspace=${APP_NAME}
RUN npm run build --workspace=${APP_NAME}
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace=${APP_NAME}"]
```

`docker-compose.yml` for co-deployed mode:

```yaml
services:
  shell:
    build: { context: ., args: { APP_NAME: hermes-shell } }
    ports: ["4000:3000"]
  gps:
    build: { context: ., args: { APP_NAME: hermes-gps-final } }
    ports: ["4001:3000"]
  chat:
    build: { context: ., args: { APP_NAME: hermes-chat-final } }
    ports: ["4002:3000"]
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes: ["./nginx.conf:/etc/nginx/nginx.conf"]
```

## Consequences

### Positive
- Each app is independently deployable — a GPS-only station deploys one container, not three
- Co-deployed mode provides a unified experience with shared auth via cookie
- Path-based routing is the simplest reverse-proxy pattern — no subdomain management, no CORS issues
- `NEXT_PUBLIC_BASE_PATH` is a standard Next.js feature, well-tested in production
- Dockerfiles are generic (parameterized by `APP_NAME`) — one Dockerfile for all three apps

### Negative
- Path-based routing means apps must be aware of their base path (`/gps`, `/chat`) when generating links and asset URLs
- Full page navigation between apps (not SPA transitions) — loses client-side state like scroll position
- Independent deployment of Chat without Shell means Chat must include its own login page (duplicated from Shell)
- Nginx configuration must be kept in sync with deployed apps

### Mitigations
- `@hermes/shared-auth` exports a `LoginPage` component used by both Shell (primary) and standalone apps (fallback) — no duplication
- `NEXT_PUBLIC_BASE_PATH` is set via env var — no code changes needed between co-deployed and standalone modes
- Link components in `@hermes/ui` automatically prepend `basePath` when generating `href` values
- Nginx config is generated from a template with app names as variables

## Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| **Single Next.js app with route groups** | Can't deploy GPS separately from Chat — violates the "independently deployable" requirement |
| **Micro-frontends (Module Federation)** | Adds significant complexity (Webpack Module Federation, shared dependency negotiation) for three small apps — not justified |
| **Subdomain-based routing** (`gps.station.local`, `chat.station.local`) | Cookies don't share across subdomains without explicit `Domain` config; requires wildcard DNS or multiple entries in `/etc/hosts` |
| **iframe embedding** (Shell loads GPS/Chat in iframes) | iframe isolation prevents shared auth cookie; requires `postMessage` for cross-app communication; double auth checks; poor mobile UX |
| **All apps always on root, selected by query param** (`/?app=gps`) | Breaks deep linking; can't bookmark GPS directly; confusing URL structure |

## References

- Next.js `basePath`: `https://nextjs.org/docs/app/api-reference/next-config-js/basePath`
- Nginx reverse proxy: `https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/`
- Auth strategy: `docs/adr/ADR-003-auth-strategy.md`