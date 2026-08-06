# ADR-001: API Client Architecture

**Status**: Accepted  
**Date**: 2026-08-06  
**Deciders**: Frontend Architect, Senior Project Manager

---

## Context

The Hermes frontend monorepo consumes the [hermes-backend](https://github.com/Rhizomatica/hermes-backend) REST API (Fastify + PostgreSQL). The existing PoC in `packages/api/` uses Node.js `https` module with a self-signed-certificate-tolerant agent. This works for SSR (Next.js API route handlers) but cannot run in the browser (client-side `fetch` scenarios like Web Workers, Capacitor native HTTP, or service workers).

The final architecture has three apps (`hermes-shell`, `hermes-gps-final`, `hermes-chat-final`) that all need to call the backend API — sometimes from SSR (Next.js route handlers), sometimes from the browser (client-side hooks).

## Decision

**We will implement a dual-mode API client in `@hermes/api`** that provides a unified interface while using the appropriate transport:

| Environment | Transport | Use Case |
|---|---|---|
| Node.js (SSR) | `node:https` with `rejectUnauthorized: false` agent | Next.js API route handlers proxying to backend |
| Browser (client) | `fetch` API (native) | Client-side hooks, service workers, Capacitor |

**Single function signature for all callers:**

```typescript
hermesGet(path: string, cookie?: string): Promise<{ data: unknown; status: number }>
hermesPost(path: string, body: unknown, cookie?: string): Promise<{ data: unknown; status: number }>
hermesDelete(path: string, cookie?: string): Promise<{ data: unknown; status: number }>
hermesPostMultipart(path: string, fields: [string, string][], file: MultipartFile, cookie?: string): Promise<{ data: unknown; status: number }>
hermesGetBuffer(path: string, cookie?: string): Promise<{ buffer: Buffer; status: number; contentType: string }>
```

**Explicit environment parameter** — no module-level ambient detection. Route handlers import from `@hermes/api/server`, client components from `@hermes/api/client`. This avoids the ambiguity of `typeof window === 'undefined'` at module load time, which can select the wrong transport when a module is imported by both server and client code.

```typescript
// packages/api/src/server.ts   — for Next.js API route handlers
import { createNodeTransport } from './transports/node';
export const { hermesGet, hermesPost, hermesDelete, hermesPostMultipart, hermesGetBuffer }
  = createNodeTransport();

// packages/api/src/client.ts   — for browser components and hooks
import { createBrowserTransport } from './transports/browser';
export const { hermesGet, hermesPost, hermesDelete }
  = createBrowserTransport();

// packages/api/src/index.ts    — re-exports both, consumer chooses
export * as server from './server';
export * as client from './client';
```

**Usage**: Route handlers import `{ hermesGet } from '@hermes/api/server'`. Client hooks import `{ hermesGet } from '@hermes/api/client'`. No ambiguity at any point.

## Consequences

### Positive
- Same import (`import { hermesGet } from '@hermes/api'`) works in both SSR and client code
- Existing PoC API route handlers require minimal changes (only endpoint paths change)
- Browser `fetch` enables request deduplication via `AbortController`
- Capacitor HTTP plugin can be added later as a third transport without changing callers

### Negative
- `node:https` transport cannot benefit from browser-native features (Service Worker caching, `fetch` priorities)
- Dual transport means two code paths to test
- `Buffer` return type from `hermesGetBuffer` is Node-only — client callers must use `hermesGetBufferClient` or receive `ArrayBuffer`

### Mitigations
- Integration tests run against both transports
- `hermesGetBuffer` is SSR-only (used by API route handlers for file proxying); client-side file downloads use a dedicated hook with `fetch` + `Blob`

## Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| `fetch` only (drop Node.js `https`) | Self-signed cert handling in Node requires `NODE_TLS_REJECT_UNAUTHORIZED=0` env var, which is a global side-effect — the `https.Agent` approach is scoped |
| `axios` as unified HTTP client | Adds 13kB dependency; native `fetch` is sufficient; Node.js `https` is zero-dependency |
| Separate `@hermes/api-server` and `@hermes/api-client` packages | Duplicates interface definitions; harder to keep in sync |

## References

- PoC implementation: `packages/api/src/index.ts`
- hermes-backend API docs: `https://github.com/Rhizomatica/hermes-backend`