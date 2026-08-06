# HF Digital Specialist — Architecture Review

**Reviewed by**: HF Digital Specialist Agent  
**Date**: 2026-08-06  
**Documents Reviewed**: All ADRs (001–009), all task lists (Phase 1–3), architecture overview, auth flow  
**Recommendation**: ⚠️ **Approve with modifications** — see required changes below

---

## Executive Summary

The frontend architecture correctly separates concerns between local services (REST API to `hermes-backend`, WebSocket to `hermes-radio-daemon`) and HF transport (handled by the backend and daemon — not the frontend's responsibility). This is the **correct boundary**: the frontend talks to local services at `localhost`, which in turn handle HF transmission over the Mercury modem. The frontend never speaks HF protocols directly.

However, **several design patterns carry Internet-centric assumptions** that will create a misleading user experience and operational confusion when deployed on actual HF radio networks. The most critical issues are:

1. **File size limits (30MB) are 50–100× too large for HF transport**
2. **Message delivery status model assumes Internet timeframes (seconds), not HF timeframes (hours)**
3. **Typing indicators are a pure Internet anti-pattern — must be removed**
4. **Retry timing uses Internet-scale backoff (1s–30s) instead of HF-scale (per transmission window)**
5. **REST API hooks assume synchronous responses — message sending must be decoupled from HF transmission**

---

## Detailed Review by Architectural Concern

### Concern 1: File Attachment Size Limits

**HF Assessment**: ❌ **Will fail over HF**

The Phase 2 and Phase 3 task lists specify file size limits of 30MB for images/audio and 20MB for other files. This is reasonable for LAN or Internet but completely unrealistic over HF radio.

A Mercury modem operating at 750 bps (~94 bytes/sec effective throughput):
- 30MB file = ~356 hours (15 days) of continuous transmission
- 1MB file = ~12 hours
- 100KB file = ~70 minutes

In practice, HF links are available only during specific propagation windows (dawn/dusk, 1–4 hours). Even a 1MB file may require multiple transmission windows spanning days.

**Mercury Assessment**: ❌ **Exceeds Mercury throughput by orders of magnitude**

Mercury is designed for short text messages, small binary attachments, and telemetry data — not media-rich files. Typical Mercury message sizes are tens of KB, not tens of MB.

**Risk Assessment**: Users will attempt to send photos over HF, expecting Internet-like delivery times. Transmissions will tie up the radio for hours or days, blocking all other communication. Failed transmissions mid-way waste bandwidth.

**Bandwidth Impact**: A single 30MB file consumes as much bandwidth as ~30,000 text-only messages. Catastrophic impact on a shared HF channel.

**Recommendation**: ⚠️ **Approve with modifications**

**Required changes:**
- Reduce file size limits to **500KB maximum** for all file types over HF
- Add a **two-tier upload UI**: "Send small version (optimized for radio, max 500KB)" vs "Send full version (may take hours/days over HF, use only in emergencies)"
- Image compression and resizing is handled by `hermes-backend`, not the frontend. Frontend only enforces the 500KB limit and warns if files exceed it.
- Audio: limit to 2 minutes, 8kHz mono, ~200KB max — speech-quality only, not music
- Display estimated transmission time based on file size: "This file will take approximately X hours to transmit over HF. Are you sure?"
- Consider a separate "large file" mode that transmits overnight or during off-peak hours

**Affected documents**: ADR-004, Phase 3 Tasks 3.2.4, 3.3.4

---

### Concern 2: Message Delivery Status Model

**HF Assessment**: ⚠️ **Will work technically, but UX is misleading**

The architecture defines three delivery states (ADR-002, ADR-004):
- `sentIds`: Message appears in "sent" endpoint → I sent it
- `syncedIds`: Not in UULS pending → picked up by sync daemon
- `DoubleCheck` component: one checkmark = sent, two checkmarks = synced

This model assumes seconds-to-minutes delivery time. Over HF:
- "Sent" means "accepted by local backend, queued for HF transmission" — could sit in queue for hours
- "Synced" means "transmitted over HF and acknowledged by remote station" — could take hours or days
- Between "sent" and "synced", the message is in transit with no visibility

Users seeing a single checkmark for hours will assume the system is broken.

**Mercury Assessment**: ⚠️ **Aligns with Mercury's store-and-forward model, but UI doesn't reflect it**

Mercury handles queuing, transmission scheduling, and acknowledgements. The frontend receives these status updates from the radio-daemon, which correctly models the pipeline. But the UI collapses the entire Mercury pipeline into "sent" vs "synced".

**Risk Assessment**: Field operators will see undelivered messages for hours and assume system failure. They may re-send messages, creating duplicates. Support burden from "why isn't my message delivered?" inquiries.

**Bandwidth Impact**: Duplicate re-sends waste HF bandwidth.

**Recommendation**: ⚠️ **Approve with modifications**

**Required changes:**
- Redesign delivery status to reflect the HF pipeline:

| UI Status | Meaning | Typical Duration | Icon |
|---|---|---|---|
| **Composed** | Draft saved locally, not yet queued for radio | Instant | Gray circle |
| **Queued** | Accepted by backend, awaiting HF transmission window | Minutes to hours | Clock icon |
| **Transmitting** | Currently being sent over HF | Minutes (varies by size) | Radio waves icon (animated) |
| **Transmitted** | Sent over HF, awaiting remote acknowledgement | Minutes to hours | Single checkmark |
| **Delivered** | Remote station confirmed receipt | Hours to days | Double checkmark (green) |
| **Failed** | Transmission failed after retries | — | Red X with retry option |

- `DoubleCheck` component renamed to `DeliveryStatus` with the expanded status model
- `NextSyncBadge` shows estimated next transmission window: "Next sync: ~14:30 UTC"
- Per-message "estimated delivery" tooltip: "Expected delivery: 2–4 hours (depending on propagation)"
- Conversation timestamp shows "Last message sent 3 hours ago (pending delivery)" rather than just a timestamp

**Affected documents**: ADR-002 §Event Catalog, ADR-004 §Optimistic Insert, Phase 3 Tasks 3.1.4, 3.2.3

---

### Concern 3: Typing Indicators

**HF Assessment**: ❌ **Fail — pure Internet anti-pattern**

Phase 3 mentions "typing indicators" (Task 3.3.2 implicitly, and the WebSocket event catalog includes `typing.start`/`typing.stop` in future phases). This feature requires:
- Persistent bi-directional communication channel
- Sub-second latency to be useful
- Continuous data transmission during message composition

Over HF, none of these exist. A typing indicator would arrive hours after the message it was supposed to accompany — or the message would arrive before the typing indicator. Completely non-functional.

**Mercury Assessment**: ❌ **Incompatible with Mercury's operational model**

Mercury operates in scheduled transmission windows, not continuous sessions. Keyboard-to-keyboard communication with sub-second feedback is fundamentally impossible over HF store-and-forward.

**Risk Assessment**: If implemented, generates useless radio traffic. Confuses users when typing indicators arrive out of order relative to messages.

**Bandwidth Impact**: Continuous typing indicator messages would consume bandwidth with no operational value.

**Recommendation**: ❌ **Reject — remove entirely**

**Required changes:**
- Remove `typing.start` and `typing.stop` from the WebSocket event catalog (ADR-002 §Event Catalog)
- Remove any mention of typing indicators from task lists
- Replace with "Last message composed at [time]" timestamp in ChatHeader — a read-only indicator that doesn't generate radio traffic

**Affected documents**: ADR-002 §Event Catalog, Phase 3 Task 3.3.2

---

### Concern 4: Retry Timing and Reconnection Strategy

**HF Assessment**: ⚠️ **Technically correct for local services, but confusing in context**

The architecture defines two retry mechanisms:
1. **WebSocket reconnection** (ADR-002): 1s → 2s → 4s → 8s → 16s → 30s max
2. **Message queue retry** (ADR-004): 3 attempts with immediate feedback

Both are appropriate for **local connections** (WebSocket to `localhost:8081`, REST to `localhost:8080`). These are LAN/localhost connections that should be re-established quickly or indicate a service crash. The retry timing is correct for local service recovery.

**However**, the plan conflates "local service connectivity" with "HF link availability", creating confusion. The WebSocket `connectionState` (`connecting | connected | disconnected | reconnecting`) is about the connection to the local `hermes-radio-daemon`, not about the HF radio link. When the daemon is connected but the HF link is unavailable, the state shows "connected" — but messages still can't be delivered.

**Mercury Assessment**: ✅ **Correct boundary — frontend retries local connections, not HF transmissions**

HF transmission retry is handled by the backend and Mercury modem, not the frontend. The frontend's retry logic is for local service recovery only.

**Risk Assessment**: Moderate — operators may interpret "connected" as "HF link active" and be confused when messages don't deliver. Need clear separation between local daemon status and HF link status.

**Recommendation**: ⚠️ **Approve with modifications**

**Required changes:**
- Add a **separate HF link status indicator** distinct from WebSocket connection state:
  - Daemon status: "Radio system: Connected" / "Radio system: Offline"
  - HF link status: "HF link: Available (next window 14:30 UTC)" / "HF link: No propagation expected until 08:00 UTC" / "HF link: Transmitting (3 messages in queue)"
- WebSocket `connectionState` remains for local daemon health
- Add `radioDaemon.hfStatus` event from the daemon providing: `{ linkAvailable, nextWindow, queueDepth, currentTransmission }`
- IndexedDB message queue should show HF-specific status: "Queued for next transmission window (~14:30 UTC)" not just "Pending"
- Offline queue auto-drain should be **configurable** — in some operational contexts, operators may want to review queued messages before transmission (to reorder, cancel, or edit)

**Affected documents**: ADR-002, ADR-004, Phase 3 Tasks 3.3.1, 3.3.3

---

### Concern 5: REST API Synchronous Response Assumptions

**HF Assessment**: ⚠️ **Will work, but only because backend handles decoupling**

The frontend sends messages via `POST /api/messages` (a Next.js proxy to `hermes-backend`). The hook `useSendMessage` (ADR-004, Task 3.3.2) expects:
- POST → 2xx → success (message sent)
- POST → !2xx → error (message failed)

This works because `hermes-backend` accepts the message and returns immediately (it doesn't wait for HF transmission). The frontend doesn't know whether the message was actually transmitted — it just knows the backend accepted it.

**This is the correct design**, but the UI and hook naming conflates "accepted by backend" with "sent over radio". The hook is named `useSendMessage` and shows "Message sent!" feedback — but the message may sit in the backend queue for hours.

**Mercury Assessment**: ✅ **Correct — decoupling at the backend boundary is appropriate**

The backend's responsibility is to accept messages, queue them for HF transmission, and handle Mercury modem interaction. The frontend should not wait for HF transmission completion.

**Risk Assessment**: Low — the backend correctly handles decoupling. Risk is in UI misleading users about actual delivery status. Same issue as Concern 2.

**Recommendation**: ✅ **Approve — but rename hooks and UI feedback**

**Required changes:**
- `useSendMessage` → remains but UI feedback changes: "Message queued" instead of "Message sent!"
- Add `useMessageStatus` hook that polls message delivery state from backend: `POST /api/messages/{id}/status` → `{ status: 'queued' | 'transmitting' | 'transmitted' | 'delivered' | 'failed' }`
- Message bubble footer shows delivery pipeline status, not just checkmark
- Conversation list shows "Last message: queued for transmission" not just "Last message: [text]"

**Affected documents**: ADR-004, Phase 3 Tasks 3.2.1, 3.3.2

---

### Concern 6: PMTiles Map (200MB) on sBitx

**HF Assessment**: ✅ **No HF impact — entirely local**

The map data is stored locally on the sBitx's microSD card and never transmitted over HF. The PMTiles format is read directly by the browser via local file access. This is a purely local resource with zero bandwidth impact on the HF link.

**Mercury Assessment**: ✅ **No Mercury interaction**

**Risk Assessment**: Low. The 200MB file must fit on the microSD card (typically 16–64GB — sufficient). The only risk is if the tile file needs updating — it would require physical access or a very long download over a LAN connection, not HF.

**Recommendation**: ✅ **Approve — no changes needed**

---

### Concern 7: PWA Strategy for Companion Devices

**HF Assessment**: ✅ **No HF impact — LAN-only communication**

Companion devices communicate with the sBitx over Wi-Fi/LAN, not HF. The PWA approach avoids the complexity of native app distribution, which is appropriate for field-deployable systems where Play Store access may not exist.

**Mercury Assessment**: ✅ **No Mercury interaction**

**Risk Assessment**: Low. Companion devices are optional — the sBitx's built-in touchscreen is the primary interface.

**Recommendation**: ✅ **Approve — no changes needed**

---

### Concern 8: Multiple Apps Running on Raspberry Pi

**HF Assessment**: ⚠️ **Operational concern, not an HF transport concern**

Running 3 separate Next.js apps on a Raspberry Pi with 2GB RAM requires careful resource management. Each Next.js production build runs a Node.js server process that consumes 80–150MB RAM. Three apps = 240–450MB RAM just for the frontend, plus nginx, plus the backend, PostgreSQL, Redis, and the radio daemon.

This is an **operational risk** for a field-deployable system — memory exhaustion could crash the entire sBitx, requiring a hard reboot during operations.

**Important constraint**: The three apps must remain **independently deployable**. Combining them into a single app is rejected — stations must be able to deploy only GPS, only Chat, or both plus the shell. This is a core architectural requirement.

**Risk Assessment**: High. Memory pressure on the Raspberry Pi could cause OOM kills during message transmission, corrupting the offline message queue or interrupting HF sessions.

**Recommendation**: ⚠️ **Approve with modifications**

**Required changes (respecting independent deployability):**
- Use **static export** for the shell app (it's mostly static — login page, app selector). A static export requires no Node.js server at runtime (served by nginx directly). This eliminates one process entirely.
- For GPS and Chat apps, use Next.js **standalone output** with `--max-old-space-size=128` per process to cap memory
- Run all three apps as **systemd services directly on the Raspberry Pi** (no Docker in production). Systemd handles process lifecycle, resource limits, and auto-restart. This eliminates Docker's memory overhead (~50–80MB for the Docker daemon).
- Add **memory monitoring** to each service: healthcheck endpoint on `/api/health`, Prometheus metrics for memory usage
- Add to Phase 1: **sBitx resource testing** — deploy all services bare-metal on an actual Raspberry Pi 4 and measure idle + under-load memory consumption
- For companion device deployments (LAN), the same apps can run on a more powerful x86 server if available

**Affected documents**: ADR-007, ADR-008, Phase 1 Task 1.1.0, Phase 1 Quality Gates

---

### Concern 9: Real-Time Presence Indicators

**HF Assessment**: ❌ **Fail — Internet anti-pattern**

ADR-002's event catalog includes `station.online` and `station.offline` events. The Phase 3 task list (3.2.6) specifies "Online/offline status indicator (green dot / gray dot)" in ChatHeader.

Over HF, a station is **never "online" in the real-time sense**. The concept of presence is meaningless — a remote station may have transmitted a message 8 hours ago but be currently unreachable due to propagation. The green/gray dot would be perpetually gray or flickering unpredictably, training operators to ignore it.

**Risk Assessment**: Users will ignore the indicator when it's always gray. When it occasionally shows green, they'll attempt real-time communication expecting immediate responses — which is impossible over HF.

**Recommendation**: ❌ **Reject — replace with "last heard" timestamp**

**Required changes:**
- Remove `station.online`/`station.offline` from the WebSocket event catalog
- Replace with `station.lastHeard` event: `{ stationId, timestamp, signalReport?, frequency? }`
- ChatHeader shows: "Last heard: 14:30 UTC (4 hours ago)" instead of a green/gray dot
- Conversation list shows: "Last contact: 2 days ago" instead of online status
- This aligns with HF operational reality — stations are contacted during propagation windows, not continuously connected

**Affected documents**: ADR-002 §Event Catalog, Phase 3 Tasks 3.2.6, 3.4.3

---

### Concern 10: Deployment Model (Docker Dev-Only)

**HF Assessment**: ✅ **Resolved — Docker is for development only**

The architecture uses Docker and `docker-compose.yml` **only for the development environment**. This is appropriate — Docker provides reproducible dev environments with all dependencies (hermes-backend, PostgreSQL, Redis) in one command.

**Production deployment on the sBitx is bare-metal**: apps run as systemd services directly on the Raspberry Pi, built via Next.js standalone output. No Docker daemon runs on the sBitx in production. This eliminates Docker's memory overhead (~50–80MB) and simplifies field maintenance.

**Build pipeline**: Next.js apps are built on a development machine (`npm run build`), producing a standalone output directory that is copied to the sBitx. No build step runs on the Raspberry Pi itself. This keeps the sBitx deployment lightweight (just Node.js + app files).

**Risk Assessment**: Low. Docker is only used for developer convenience. Production deployment is bare-metal systemd services, which is simpler and more resource-efficient for the Raspberry Pi.

**Recommendation**: ✅ **Approve — no changes needed. Current plan is correct.**

**Affected documents**: ADR-007, ADR-008, Phase 1 Quality Gates

---

## Summary of Required Modifications

| # | Concern | Severity | Action |
|---|---|---|---|
| 1 | File size limits (30MB) | ❌ Critical | Reduce to 500KB max. Image compression handled by backend. Add transmission time estimate. |
| 2 | Message delivery status model | ⚠️ High | Redesign to 5-stage HF pipeline (Composed→Queued→Transmitting→Transmitted→Delivered). |
| 3 | Typing indicators | ❌ Critical | Remove entirely. Replace with "Last composed at" timestamp. |
| 4 | Retry timing conflation | ⚠️ Medium | Separate local daemon status from HF link status. Add HF transmission window awareness. |
| 5 | REST API synchronous assumptions | ⚠️ Medium | Rename UI feedback to "Message queued". Add message status polling hook. |
| 6 | PMTiles map | ✅ None | No changes needed. |
| 7 | PWA strategy | ✅ None | No changes needed. |
| 8 | Raspberry Pi memory pressure | ⚠️ High | Static export for shell. Standalone output + systemd for GPS/Chat. No Docker in production. `--max-old-space-size=128`. |
| 9 | Real-time presence indicators | ❌ Critical | Replace green/gray dot with "Last heard: [timestamp]" display. |
| 10 | Docker dev-only deployment | ✅ None | Docker is for development. Production = systemd services on bare-metal. No changes needed. |

---

## Overall Recommendation

⚠️ **Approve with modifications**

The architecture correctly places the HF transport boundary at the backend and daemon level. The frontend communicates with local services only and never speaks HF protocols directly — this is the correct design.

However, the **user experience is currently designed for Internet-connected messaging, not HF radio**. The critical modifications (file size limits, delivery status model, typing indicators removal, presence indicators replacement) must be addressed before development begins. These are not cosmetic changes — they fundamentally affect how operators understand and use the system.

The frontend must educate users about HF reality, not hide it behind Internet-style UX patterns. When a message takes 4 hours to deliver, the UI should make that normal and expected, not an anomaly.

---

## Post-Modification Review Required

After the above modifications are incorporated into the ADRs and task lists, re-submit for HF Digital Specialist re-review. The following items require specific sign-off:

1. Revised file size limits and compression strategy
2. Revised message delivery status model with HF pipeline stages
3. Confirmation that typing indicators and presence indicators are removed from all documents
4. sBitx resource testing results (Phase 1)

---

**Reviewer**: HF Digital Specialist Agent  
**Signature**: 📻 Approved with modifications