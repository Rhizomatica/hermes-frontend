# HERMES Frontend — Project Brief

**Project**: hermes-fronted
**Last Updated**: 2026-08-06
**Status**: Planning complete. Development begins Phase 1.

---

## What is HERMES?

**HERMES** (High-frequency Emergency and Rural Multimedia Exchange System) enables communities in remote or disaster-affected areas to exchange messages, files, and GPS coordinates over **HF radio** (3–30 MHz shortwave). HF radio propagates over the horizon via ionospheric reflection — one of the few communication methods that works without internet, cell towers, or satellites.

This repository is the **frontend monorepo** — the user interface that runs on the sBitx transceiver and companion devices.

---

## What We're Building

Three independently deployable web applications:

| App | Purpose | Port | Primary Screen |
|---|---|---|---|
| **hermes-shell** | Login + app selector + navigation hub | `:4000` | sBitx 7-inch touchscreen |
| **hermes-gps-final** | GPS coordinate viewer with offline map, real-time tracking, breadcrumb trail | `:4001` | sBitx 7-inch touchscreen |
| **hermes-chat-final** | Messaging client with offline queue, file uploads, encrypted messages, radio info dashboard | `:4002` | sBitx 7-inch touchscreen |

**Canonical deployment target**: **sBitx** — Raspberry Pi 4 (ARM64, 2–4GB RAM), 7-inch 800×480 touchscreen, Chromium kiosk mode, fully air-gapped. All services run on `localhost`.

**Companion devices** (tablets/phones): Connect over LAN via PWA (no native app needed).

---

## Architecture at a Glance

```
┌──────────────────────────────────────────────────┐
│              sBitx (Raspberry Pi)                 │
│                                                   │
│  Chromium kiosk → nginx → hermes-shell :4000      │
│                         → hermes-gps-final :4001   │
│                         → hermes-chat-final :4002  │
│                                                   │
│  Backend services (localhost):                    │
│    hermes-backend       :8080 (REST API)           │
│    hermes-radio-daemon  :8081 (WebSocket)          │
│    PostgreSQL           :5432                      │
│    Redis                :6379                      │
└──────────────────────────────────────────────────┘
```

**Key decisions**:
- HttpOnly cookie auth shared across all apps (single login)
- Offline maps via PMTiles (no internet needed)
- Offline message queue via IndexedDB (messages persist across restarts)
- PWA for companion devices (replaces Capacitor)
- Docker for dev only — production deploys as systemd services
- Fully automated CI/CD: lint → typecheck → test → build → E2E → deploy

---

## Development Phases

| Phase | Duration | What Gets Built |
|---|---|---|
| **Phase 1** | Weeks 1–2 | Login, shared auth, app scaffolding, design system, CI/CD pipeline |
| **Phase 2** | Weeks 3–5 | GPS viewer with offline map, real-time tracking, breadcrumbs |
| **Phase 3** | Weeks 6–9 | Chat with offline queue, file uploads, encryption, radio info |
| **Total** | **9 weeks** | 46 tasks across 3 phases |

---

## Your Workflow

1. **Write code** → follow Engineering Standards
2. **Push + open PR** → CI runs automatically (lint, types, tests, build, E2E, bundle)
3. **Check CI** → all green? Self-review against PR checklist
4. **Request review** → 1 reviewer (app code) or 2 (shared packages)
5. **Approve + merge** → auto-deploy to staging sBitx
6. **Tag release** (`git tag v1.0.0`) → auto-deploy to production sBitx

Everything except steps 1, 3, 4, and 5 is automated.

---

## Key Documents

| Document | What It Contains |
|---|---|
| [Development Plan](./development-plan.md) | Full roadmap, task lists, workflow diagram |
| [Engineering Standards](./governance/engineering-standards.md) | Commit conventions, code patterns, PR template, testing standards, TypeScript rules, ESLint config |
| [Architecture Overview](./architecture/frontend-overview.md) | System context, component tree, data flow diagrams, directory structure |
| [Authentication Flow](./architecture/auth-flow.md) | Login sequence, token refresh, cross-app auth, logout |
| [ADR-001: API Client](./adr/ADR-001-api-client.md) | Dual-mode API client (server vs client transport) |
| [ADR-003: Auth Strategy](./adr/ADR-003-auth-strategy.md) | HttpOnly cookies, single-flight token refresh |
| [ADR-008: sBitx Deployment](./adr/ADR-008-sbitx-deployment.md) | Raspberry Pi hardware constraints, touch-first UI, resource budgets |
| [ADR-009: Mobile Strategy](./adr/ADR-009-mobile-strategy.md) | PWA over Capacitor for companion devices |
| [HF Digital Specialist Audit](./audit/2026-08-06-hf-digital-specialist-review.md) | 10 architectural concerns validated against HF radio reality |
| [Senior Reviewer Audit](./audit/2026-08-06-senior-reviewer-assessment.md) | 18 findings across architecture, security, testing, DevOps |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 LTS |
| Monorepo | Turborepo 2.x |
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 3.4 |
| Language | TypeScript 5 (strict mode) |
| i18n | next-intl 4 (en, pt) |
| Maps | MapLibre GL JS + PMTiles (offline) |
| Auth | JWT RS256 (HttpOnly cookies) |
| Testing | Vitest + Playwright + React Testing Library |
| CI/CD | GitHub Actions (lint, typecheck, test, build, E2E, deploy) |
| Production | systemd services on Raspberry Pi ARM64 |
| Development | Docker Compose (for backend dependencies) |

---

## Repository Structure

```
hermes-fronted/
├── apps/
│   ├── hermes-chat/              # PoC (reference only — not built)
│   ├── hermes-gps/               # PoC (reference only — not built)
│   ├── hermes-shell/             # Login + navigation hub
│   ├── hermes-gps-final/         # GPS viewer (production)
│   └── hermes-chat-final/        # Chat client (production)
│
├── packages/
│   ├── api/                      # @hermes/api — dual-mode API client + types
│   ├── ui/                       # @hermes/ui — shared components
│   ├── shared-auth/              # @hermes/shared-auth — auth, WebSocket, locale
│   ├── tailwind-config/          # @hermes/tailwind-config — design tokens
│   ├── config/                   # @hermes/config — ESLint, TypeScript presets
│   └── utils/                    # @hermes/utils — conversation, formatting
│
├── docs/                         # All project documentation
│   ├── adr/                      # Architecture Decision Records (9 docs)
│   ├── tasks/                    # Phase task lists (3 docs, 46 tasks)
│   ├── architecture/             # System architecture docs
│   ├── audit/                    # Independent review reports
│   ├── governance/               # Engineering standards
│   ├── development-plan.md       # This development roadmap
│   └── project-brief.md          # This document
│
├── .github/
│   ├── workflows/ci.yml          # PR CI pipeline
│   ├── workflows/release.yml     # ARM64 build + deploy pipeline
│   └── pull_request_template.md  # PR checklist template
│
├── docker-compose.yml            # Dev-only (backend dependencies)
├── turbo.json
└── package.json