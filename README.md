# HERMES Frontend

Monorepo for the HERMES  High-frequency Emergency and Rural Multimedia Exchange System
 — three Next.js 16 apps designed for Raspberry Pi ARM64, 7-inch 800×480 touchscreen (ADR-008).

## Architecture

```
nginx: / → shell  /gps → gps  /chat → chat
├── apps/hermes-shell       (port 4000) Auth + App Selector
├── apps/hermes-gps-final   (port 4001) Offline GPS Maps
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