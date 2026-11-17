# HERMES Frontend

Monorepo for the HERMES  High-frequency Emergency and Rural Multimedia Exchange System
 — three Next.js 16 apps designed for Raspberry Pi ARM64, 7-inch 800×480 touchscreen (ADR-008).

## Architecture

```
nginx: / → shell  /gps → gps  /chat → chat
├── apps/hermes-shell       (port 4000) Auth + App Selector
├── apps/hermes-gps   (port 4001) Offline GPS Maps
├── apps/hermes-chat-final  (port 4002) Messaging
├── packages/shared-auth    Auth, WebSocket, i18n
├── packages/api            Dual-mode API client
├── packages/ui             Shared components
└── packages/tailwind-config Design tokens
```

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev          # All three apps
npm run dev:shell    # Shell only (port 4000)
npm run dev:gps      # GPS only (port 4001)
npm run dev:chat     # Chat only (port 4002)
```

## Developing against a remote station (direct over VPN)

When the station that runs `hermes-radio-daemon` is reachable over the VPN, point
the frontend directly at its API. The daemon listens on `8080` and serves HTTPS
with a certificate for `*.hermes.radio`, so use a certificate name even when the
URL contains an IP address:

```env
HERMES_API_URL=https://10.70.96.210:8080/
HERMES_API_TLS_SERVERNAME=caldono.hermes.radio
NEXT_PUBLIC_WS_URL=ws://localhost:8082/api/v2/ws
```

`HERMES_API_TLS_SERVERNAME` sets Node's TLS `servername` option, so certificate
verification stays enabled. No SSH tunnel and no `/etc/hosts` entry are needed.

Restart the dev stack after changing `.env.local`:

```bash
npm run dev:all
```

Verify the daemon is reachable before logging in:

```bash
curl https://caldono.hermes.radio:8080/api/v2/health
```

Use `/api/v2/health`, not `/api/v2/system`: the deployed daemon does not expose
`/system`.

Use a test station or a dedicated test user when exercising destructive features
such as user deletion, password resets, or station settings.

## Testing

```bash
npm test             # Unit tests
npm run test:e2e     # E2E tests
npm run typecheck    # TypeScript check
npm run lint         # ESLint
```

## Deployment (sBitx)

```bash
./scripts/build-arm64.sh hermes-shell
./scripts/deploy-sbitx.sh hermes-shell 10.70.96.5
./scripts/rollback-sbitx.sh hermes-shell
```

## Phase Status

| Phase | Status |
|---|---|
| Phase 1 — Shell, Foundation & Login | ✅ Complete |
| Phase 2 — GPS Application | 📋 Planned |
| Phase 3 — Chat Application | 📋 Planned |

## Key Docs

- [Development Plan](docs/development-plan.md)
- [Engineering Standards](docs/governance/engineering-standards.md)
- [Architecture](docs/architecture/frontend-overview.md)
- [ADRs](docs/adr/)