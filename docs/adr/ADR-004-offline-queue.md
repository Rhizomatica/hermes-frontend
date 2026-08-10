# ADR-004: Offline Message Queue & HF Delivery Status

**Status**: Accepted  
**Date**: 2026-08-06  
**Updated**: 2026-08-10 (HF Digital Specialist review — delivery status model and file size limits)  
**Deciders**: Frontend Architect, Senior Project Manager, HF Digital Specialist

---

## Context

Hermes stations operate over HF radio in remote areas with intermittent or no internet connectivity. The frontend must allow users to compose and "send" messages even when the backend is unreachable. These messages must be queued locally and automatically transmitted when connectivity is restored.

The PoC (`useSendMessage.ts`) has no offline support — if the network is unavailable, the message is lost and an error is shown. This is unacceptable for production.

**HF Reality Constraint**: Message delivery over HF is fundamentally different from Internet messaging:
- "Sent" = accepted by local backend, queued for HF transmission — NOT transmitted over radio
- HF transmission occurs during scheduled propagation windows (dawn/dusk, 1–4 hours each), not continuously
- A message may sit in the transmission queue for hours before being sent
- Delivery confirmation from the remote station may take hours or days
- File attachments must be sized for HF throughput (~94 bytes/sec effective at 750 bps) — not for Internet bandwidth

The delivery status model must reflect this HF pipeline, not Internet assumptions of seconds-to-minutes delivery.

## Decision

**We will implement an IndexedDB-backed offline message queue in `@hermes/shared-auth`.** The queue provides persistent local storage for messages awaiting HF transmission, with visibility into the full HF delivery pipeline.

### HF Delivery Status Model (5-Stage Pipeline)

The frontend models message delivery as five distinct stages that reflect HF operational reality:

| # | Stage | Meaning | Typical Duration | UI Icon |
|---|---|---|---|---|
| 1 | **Composed** | Draft saved locally, not yet queued for radio | Instant | Gray circle |
| 2 | **Queued** | Accepted by backend, awaiting HF transmission window | Minutes to hours | Clock icon |
| 3 | **Transmitting** | Currently being sent over HF by the Mercury modem | Minutes (varies by size) | Animated radio waves |
| 4 | **Transmitted** | Sent over HF, awaiting remote acknowledgement | Minutes to hours | Single checkmark |
| 5 | **Delivered** | Remote station confirmed receipt | Hours to days | Green double checkmark |
| ✗ | **Failed** | Transmission failed after retries | — | Red X with retry option |

### Queue Schema (IndexedDB)

```typescript
interface QueuedMessage {
  uuid: string;            // Client-generated UUID (primary key)
  payload: SendPayload;     // { text, file?, pass, orig, dest, sent_at }
  createdAt: number;        // Date.now() when queued
  retryCount: number;       // Incremented on each failed send attempt
  lastError?: string;       // Last error message for UI display
  status: 'composed' | 'queued' | 'transmitting' | 'transmitted' | 'delivered' | 'failed';
  deliveryEstimate?: string; // Human-readable estimate: "~2-4 hours (next window 14:30 UTC)"
}
```

### Queue Flow (HF-Aware)

```
User taps "Send"
      │
      ▼
Save to IndexedDB
  status: 'composed'
  deliveryEstimate: "~2-4 hours"
      │
      ▼
POST to API (if backend reachable)
      │
   ┌──┴──┐
   │ 2xx │                    │ !2xx or offline │
   └──┬──┘                    └──┬──┘
      │                          │
   status: 'queued'         Keep as 'composed'
   "Message queued for      Retry on next
    next transmission        reconnection
    window"                  (Persistent local queue)
      │
      ▼
  ┌─────────────────────────────────────┐
  │ hermes-backend + Mercury modem      │
  │ handle HF transmission scheduling   │
  └─────────────────────────────────────┘
      │
      ▼
  radioDaemon.hfStatus event:
    currentTransmission = uuid
      → status: 'transmitting'
      │
      ▼
  message.synced event
      → status: 'transmitted'
      │
      ▼
  message.delivered event
      → status: 'delivered'
      │
      ▼
  On failure (after backend retries exhausted):
      → status: 'failed'
      → Show per-message error with retry option
```

### idempotency

All messages are assigned a client-generated UUID before queuing. The backend uses this UUID as an idempotency key — if the same message is submitted twice (e.g., queue retry while original is still in-flight), the backend deduplicates by UUID.

### Optimistic Insert

While a message is queued or in-flight, it appears in the conversation immediately with:
- `draft: true` — visually distinct (slightly transparent, HF delivery status indicator)
- `sent_at: new Date()` — client-side timestamp
- `id: client UUID` — replaced with server `id` on confirmation
- `deliveryStatus` — current stage from the 5-stage pipeline

When the server confirms the message was accepted (status → `queued`), the optimistic message's delivery status is updated in real-time. Further transitions (`transmitting` → `transmitted` → `delivered`) are pushed via WebSocket events from `hermes-radio-daemon`.

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

// packages/shared-auth/src/useMessageStatus.ts

function useMessageStatus(messageId: string): {
  status: 'composed' | 'queued' | 'transmitting' | 'transmitted' | 'delivered' | 'failed';
  deliveryEstimate: string | null;
  lastUpdate: Date | null;
}
```

### UI Feedback (HF-Aware)

| Action | Hook | UI Feedback |
|---|---|---|
| User taps send | `useSendMessage` | "Message queued for transmission" — not "Message sent!" |
| Backend accepts message | `useMessageStatus` | Delivery status updates to `queued` — clock icon with "Next window: ~14:30 UTC" |
| Mercury begins transmission | `useMessageStatus` (via WS `radioDaemon.hfStatus`) | `transmitting` — animated radio waves icon |
| Remote station acks receipt | `useMessageStatus` (via WS `message.delivered`) | `delivered` — green double checkmark |
| Transmission fails | `useMessageStatus` | `failed` — red X with manual retry button |

### File Attachment Size Limits (HF-Aware)

**Maximum file size: 500KB for all file types over HF.**

| File Type | Max Size | Typical HF Transmission Time (at 750 bps) |
|---|---|---|
| Images | 500KB (auto-compressed by backend) | ~70 minutes |
| Audio | 200KB (2 min, 8kHz mono, speech-quality) | ~30 minutes |
| Other | 500KB | ~70 minutes |

The frontend enforces a **500KB hard limit** before upload. The backend performs image compression and audio downsampling. The UI warns users when files approach the limit:

> "This file is 480KB. Estimated HF transmission time: ~65 minutes. Are you sure you want to send this over HF?"

## Consequences

### Positive
- Messages are never lost due to network unavailability — they persist in IndexedDB across page reloads and app restarts
- UUID-based idempotency prevents duplicate sends even if the queue drains while a previous attempt is still in-flight
- Optimistic insert gives immediate user feedback — the app feels responsive even when offline
- `useOfflineQueue` hook provides UI with queue status for indicators like "3 messages queued (next window ~14:30 UTC)"
- 5-stage delivery model educates operators about HF reality rather than hiding it
- `radioDaemon.hfStatus` events decouple local daemon health from HF link availability — operators can see whether the radio system is online vs whether the HF link is available

### Negative
- IndexedDB adds complexity vs the simpler `localStorage` approach (but `localStorage` has 5–10MB limit and synchronous API)
- File attachments in the queue must reference local file URIs or be stored as blobs — files up to 500KB may approach IndexedDB storage limits on resource-constrained devices
- Queue ordering: messages sent offline should be transmitted in FIFO order, but the user may expect the most recent message to appear last in the conversation (order is based on `sent_at` timestamp, not send time)
- The 5-stage delivery model requires the daemon to emit `radioDaemon.hfStatus` events — this is a new daemon requirement

### Mitigations
- Files >500KB are rejected by the frontend before queueing — user is shown "File too large for HF transmission (max 500KB). Reduce size or send via alternative channel."
- Queue drain respects message ordering by `createdAt`
- Failed messages (status: `failed`) are visually distinct and can be manually retried or deleted
- IndexedDB is wrapped with the `idb` library for a Promise-based API
- Offline queue auto-drain is **configurable** — in some operational contexts, operators may want to review queued messages before transmission (to reorder, cancel, or edit)
- IndexedDB persistence on Chromium kiosk mode must be verified in Phase 1 (see `performance-expectations.md`)

## Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| `localStorage` for queue | Synchronous API blocks main thread; 5–10MB limit insufficient for file metadata; no structured query support |
| Service Worker Background Sync | Requires HTTPS and browser support; Chromium kiosk may not support it; adds complexity |
| In-memory queue only (no persistence) | Messages lost on page refresh/app restart — unacceptable for HF radio use case |
| Queue in backend (server-side) | Defeats the purpose — can't reach backend when offline |
| Internet-scale delivery model (sent/delivered only) | 2-stage model collapses the HF pipeline — operators see undelivered messages for hours and assume system failure |
| File size limits at 30MB (Internet-scale) | 30MB = ~15 days of continuous HF transmission at 750 bps — blocks all other communication |

## References

- IndexedDB API: `https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API`
- `idb` library: `https://github.com/jakearchibald/idb`
- Frontend Architect agent: `§Offline-First UX & Optimistic Updates`
- PoC `useSendMessage.ts`: current implementation without offline support
- HF Digital Specialist Review: `docs/audit/2026-08-06-hf-digital-specialist-review.md` (Concerns 1, 2, 5)
- `radioDaemon.hfStatus` event: `docs/adr/ADR-002-websocket-client.md` §Event Catalog