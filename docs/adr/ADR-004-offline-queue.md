# ADR-004: Offline Message Queue

**Status**: Accepted  
**Date**: 2026-08-06  
**Deciders**: Frontend Architect, Senior Project Manager

---

## Context

Hermes stations operate over HF radio in remote areas with intermittent or no internet connectivity. The frontend (wrapped as a Capacitor Android app) must allow users to compose and "send" messages even when the backend is unreachable. These messages must be queued locally and automatically transmitted when connectivity is restored.

The PoC (`useSendMessage.ts`) has no offline support — if the network is unavailable, the message is lost and an error is shown. This is unacceptable for production.

## Decision

**We will implement an IndexedDB-backed offline message queue in `@hermes/shared-auth` (as part of the `WebSocketProvider`/connectivity layer).**

The queue:
1. Stores serialized `SendPayload` objects with a client-generated UUID
2. Drains automatically when `connectionState` transitions to `connected`
3. Provides UI hooks for queue status ("3 messages pending", per-message retry/delete)
4. Implements idempotency via UUID to prevent duplicate sends on reconnection edge cases

### Queue Schema (IndexedDB)

```typescript
interface QueuedMessage {
  uuid: string;            // Client-generated UUID (primary key)
  payload: SendPayload;     // { text, file?, pass, orig, dest, sent_at }
  createdAt: number;        // Date.now() when queued
  retryCount: number;       // Incremented on each failed send attempt
  lastError?: string;       // Last error message for UI display
  status: 'pending' | 'sending' | 'failed';
}
```

### Queue Flow

```
User taps "Send"
      │
      ▼
Is connectionState === 'connected'?
      │
   ┌──┴──┐
   │ Yes │                    │ No  │
   └──┬──┘                    └──┬──┘
      │                          │
  POST to API               Save to IndexedDB
      │                     status: 'pending'
   ┌──┴──┐                       │
   │ 2xx │    │ !2xx │      Show "queued" indicator
   └──┬──┘    └──┬──┘            │
      │          │               │
   Success    Retry or      On reconnect:
   (normal)   mark failed       │
                           Drain queue:
                           for each 'pending':
                             POST to API
                             on success → delete from queue
                             on failure → retryCount++
                                if retryCount > 3:
                                  status: 'failed'
                                  show per-message error
```

### Optimistic Insert

While a message is queued or in-flight, it appears in the conversation immediately with:
- `draft: true` — visually distinct (slightly transparent, pending indicator)
- `sent_at: new Date()` — client-side timestamp
- `id: -1` (or client UUID) — replaced with server `id` on confirmation

When the server confirms the send, the optimistic message is replaced with the server's version (real `id`, `draft: false`).

### API

```typescript
// packages/shared-auth/src/useOfflineQueue.ts
function useOfflineQueue(): {
  queueLength: number;
  pendingMessages: QueuedMessage[];
  isDraining: boolean;
  retryMessage(uuid: string): Promise<void>;
  removeMessage(uuid: string): void;  // delete from queue without sending
}
```

## Consequences

### Positive
- Messages are never lost due to network unavailability — they persist in IndexedDB across page reloads and app restarts
- UUID-based idempotency prevents duplicate sends even if the queue drains while a previous attempt is still in-flight
- Optimistic insert gives immediate user feedback — the app feels responsive even when offline
- `useOfflineQueue` hook provides UI with queue status for indicators like "3 messages pending"

### Negative
- IndexedDB adds complexity vs the simpler `localStorage` approach (but `localStorage` has 5–10MB limit and synchronous API)
- File attachments in the queue must reference local file URIs or be stored as blobs — large files may hit IndexedDB storage limits
- Queue ordering: messages sent offline should be transmitted in FIFO order, but the user may expect the most recent message to appear last in the conversation (order is based on `sent_at` timestamp, not send time)

### Mitigations
- Files >10MB are not stored in IndexedDB — only a reference (file path/URI) is queued, and the file is re-read on drain
- Queue drain respects message ordering by `createdAt`
- Failed messages (retryCount > 3) are visually distinct and can be manually retried or deleted
- IndexedDB is wrapped with the `idb` library for a Promise-based API

## Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| `localStorage` for queue | Synchronous API blocks main thread; 5–10MB limit insufficient for file metadata; no structured query support |
| Service Worker Background Sync | Requires HTTPS and browser support; Capacitor WebView may not support it; adds complexity |
| In-memory queue only (no persistence) | Messages lost on page refresh/app restart — unacceptable for HF radio use case |
| Queue in backend (server-side) | Defeats the purpose — can't reach backend when offline |

## References

- IndexedDB API: `https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API`
- `idb` library: `https://github.com/jakearchibald/idb`
- Frontend Architect agent: `§Offline-First UX & Optimistic Updates`
- PoC `useSendMessage.ts`: current implementation without offline support