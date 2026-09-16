# Phase 3 — Chat Application Task List

**Project**: hermes-fronted
**Phase Duration**: Weeks 6–9
**Prerequisites**: Phase 1 + Phase 2 complete — `@hermes/shared-auth` with `WebSocketProvider`, `hermes-chat-final` scaffolded and auth-aware
**Generated**: 2026-08-06

## Phase Objectives

Deliver a production-ready messaging client with offline message queue, real-time delivery notifications via `hermes-radio-daemon` WebSocket, file attachments, encrypted messages, and radio telemetry views. The chat app must work offline (queue messages locally, auto-send on reconnect) and provide a responsive, accessible UI.

---

## Week 6: Chat Core — Data Layer & Conversation List

### [ ] Task 3.1.1: Source-of-truth types in `@hermes/api`

**Description**: Move and enhance the `Message`, `Conversation`, `Station`, and `HermesUser` types from the PoC into `@hermes/api` as the canonical shared type definitions. Add missing fields for the new backend (server-provided `unreadCount`, `synced` status).

**Acceptance Criteria**:
- [ ] `Message` interface with: `id`, `inbox`, `draft`, `orig`, `dest`, `name`, `text`, `file`, `fileid`, `mimetype`, `secure`, `sent_at`, `synced`, `unread`
- [ ] `Conversation` interface with: `station`, `lastMessage`, `unreadCount` (from server, not inbox-flag heuristic)
- [ ] `Station` interface with: `name`, `alias`, `status`
- [ ] `HermesUser` interface with: `id`, `admin`, `email`, `name`, `phone`, `location`
- [ ] All types exported from `packages/api/src/types.ts`
- [ ] JSDoc on all fields

**Files to Create/Edit**:
- `packages/api/src/types.ts` — all shared types
- `packages/api/src/index.ts` — re-export types

**Stack Notes**: PoC reference: `apps/hermes-chat/src/lib/message.ts`, `apps/hermes-chat/src/lib/user.ts`, `apps/hermes-chat/src/lib/conversation.ts`.

**Doc Reference**: PoC types, hermes-backend API response shapes

---

### [ ] Task 3.1.2: Message normalization utilities

**Description**: Port and enhance the PoC normalization functions: `destArray()`, `stationId()`/`bare()`, `canonicalize()`. Move to `@hermes/api` as pure utility functions with full test coverage.

**Acceptance Criteria**:
- [ ] `destArray(dest: string | string[]): string[]` — always returns array (PoC validated)
- [ ] `stationId(address: string): string` — strips @domain and .domain suffixes
- [ ] `canonicalize(address: string, aliasMap: Map<string, string>): string` — resolves to canonical alias
- [ ] Unit tests for all functions: edge cases (empty string, null-like input, mixed formats)
- [ ] Exported from `@hermes/api`

**Files to Create/Edit**:
- `packages/api/src/normalize.ts` — normalization utilities
- `packages/api/src/normalize.test.ts` — unit tests
- `packages/api/src/index.ts` — add exports

**Stack Notes**: PoC reference: `apps/hermes-chat/src/lib/message.ts` lines 17–21, `apps/hermes-chat/src/lib/conversation.ts` lines 15–35, `apps/hermes-chat/src/app/api/messages/route.ts` lines 9–13.

**Doc Reference**: PoC message.ts, conversation.ts

---

### [ ] Task 3.1.3: API route proxy — `GET /api/messages` (merged inbox + sent)

**Description**: Port and enhance the PoC `/api/messages` route handler that merges inbox and sent messages, deduplicates by ID, and sets the `inbox` flag based on `orig` matching station identity.

**Acceptance Criteria**:
- [ ] `GET /api/messages` → fetches inbox and sent from hermes-backend in parallel
- [ ] Deduplicates by `id`
- [ ] Sets `inbox: false` when `bare(orig) === bare(myStationId)`
- [ ] Returns merged array sorted by `sent_at` descending
- [ ] Fetches station identity from `GET /api/sys/status` for comparison
- [ ] Handles backend errors gracefully (returns empty array + logs error)

**Files to Create/Edit**:
- `apps/hermes-chat-final/src/app/api/messages/route.ts` — GET handler
- `apps/hermes-chat-final/src/app/api/messages/route.ts` — POST handler (proxy to backend)
- `apps/hermes-chat-final/src/app/api/messages/route.ts` — DELETE handler (proxy to backend)

**Stack Notes**: PoC reference: `apps/hermes-chat/src/app/api/messages/route.ts` lines 15–50. Use `hermesGet`/`hermesPost`/`hermesDelete` from `@hermes/api`.

**Doc Reference**: PoC messages/route.ts, ADR-001

---

### [ ] Task 3.1.4: `useChatData` hook

**Description**: Server-state hook that fetches messages, tracks sent IDs and synced IDs, and supports real-time updates via WebSocket. Implements stale-while-revalidate cache, request deduplication, and tri-state return.

**Acceptance Criteria**:
- [ ] Fetches `GET /api/messages` on mount → sets `messages`
- [ ] Fetches `GET /api/messages/sent` + `GET /api/sys/uuls` to compute `sentIds` and `syncedIds`
- [ ] `sentIds`: Set of message IDs that I sent
- [ ] `syncedIds`: Subset of `sentIds` that have been picked up by the UUCP sync daemon (not in UULS pending)
- [ ] Tri-state return: `{ messages, sentIds, syncedIds, loading, error, refresh }`
- [ ] Subscribes to `message.new` WS event → appends to messages
- [ ] Subscribes to `message.delivered` WS event → adds to `syncedIds`
- [ ] Module-level cache with stale-while-revalidate
- [ ] In-flight request deduplication
- [ ] Unit tested with mocked fetch and mocked WS

**Files to Create/Edit**:
- `apps/hermes-chat-final/src/hooks/useChatData.ts`
- `apps/hermes-chat-final/src/hooks/useChatData.test.ts`

**Stack Notes**: PoC reference: `apps/hermes-chat/src/hooks/useChatData.ts` (77 lines). Enhance with ADR-006 cache pattern (module-level Map), WS subscription, and ServerState type.

**Doc Reference**: ADR-006 §ServerState, ADR-002 §Event Catalog, PoC useChatData.ts

---

### [ ] Task 3.1.5: `buildConversations` + `filterConversation` logic

**Description**: Port and enhance the PoC conversation grouping logic. Fix the unread count heuristic (current PoC uses `msgs.filter(m => m.inbox).length` which the PoC itself marked with a TODO). The server should provide `unreadCount` per conversation.

**Acceptance Criteria**:
- [ ] `buildConversations(messages: Message[], aliasMap: Map<string, string>): Conversation[]`
- [ ] Groups messages by canonical station alias (PoC logic, validated)
- [ ] Sorts conversations by most recent message
- [ ] `unreadCount` derived from server-provided field (fallback to inbox-flag count if server doesn't provide it yet)
- [ ] `filterConversation(messages: Message[], station: string, aliasMap: Map<string, string>): Message[]`
- [ ] Filters to messages for a specific station (canonical alias matching)
- [ ] Sorts oldest-first for chat view
- [ ] Unit tested

**Files to Create/Edit**:
- `packages/api/src/conversation.ts` — buildConversations + filterConversation
- `packages/api/src/conversation.test.ts`

**Stack Notes**: PoC reference: `apps/hermes-chat/src/lib/conversation.ts` (100 lines). Most logic is validated — enhance with server unread count.

**Doc Reference**: PoC conversation.ts

---

### [ ] Task 3.1.6: Conversation list page

**Description**: Build the main conversation list page. Shows all conversations grouped by station. Pull-to-refresh, debounced search, skeleton loading, empty state.

**Acceptance Criteria**:
- [ ] Uses `useAuthGuard` + `useChatData` + `useStationAlias`
- [ ] `buildConversations` transforms messages into conversation list
- [ ] Search input filters by station alias or callsign (debounced 300ms)
- [ ] Pull-to-refresh triggers `refresh()` from `useChatData`
- [ ] Loading state: `LoadingSpinner` (not blank screen)
- [ ] Empty state: "No conversations yet" with illustration
- [ ] Error state: `ErrorBanner` with retry button
- [ ] Navigation to chat on tap: `router.push('/chat/${station}')`
- [ ] New chat FAB button → navigates to `/new-chat`
- [ ] All strings from `next-intl`
- [ ] Accessible: list roles, keyboard navigation

**Files to Create/Edit**:
- `apps/hermes-chat-final/src/app/page.tsx` — conversation list (authenticated)
- `apps/hermes-chat-final/src/components/home/ConversationList.tsx`
- `apps/hermes-chat-final/messages/en.json` — `home` namespace
- `apps/hermes-chat-final/messages/pt.json` — `home` namespace

**Stack Notes**: PoC reference: `apps/hermes-chat/src/app/home/page.tsx` (97 lines). Rebuild with enhanced hooks and proper state handling.

**Doc Reference**: PoC home/page.tsx, Frontend Architect agent §Chat Experience

---

## Week 7: Chat Screen — Messages & Input

### [ ] Task 3.2.1: Chat screen page

**Description**: Build the chat screen that composes `MessageList`, `MessageInput`, `ChatHeader`, and the send-message flow. Reads `station` from URL params.

**Acceptance Criteria**:
- [ ] Route: `/chat/[station]` — `station` from URL params (URL-decoded)
- [ ] Uses `useChatData(station, aliasMap)` for messages
- [ ] Uses `useSendMessage` for composing and sending
- [ ] Uses `useNodeInfo` for station identity (`orig`)
- [ ] Uses `useStationAlias` for alias resolution
- [ ] State: `text`, `selectedFile`, `pass`, `error`
- [ ] On send success: clear text, clear file, clear pass, refetch messages, focus input
- [ ] Error display: `ErrorBanner` for send errors and fetch errors

**Files to Create/Edit**:
- `apps/hermes-chat-final/src/app/chat/[station]/page.tsx`

**Stack Notes**: PoC reference: `apps/hermes-chat/src/app/home/chat/[station]/page.tsx` (86 lines).

**Doc Reference**: PoC chat/[station]/page.tsx

---

### [ ] Task 3.2.2: `MessageList` component

**Description**: Scrollable message list with top-triggered lazy pagination, date dividers, scroll-to-bottom behavior, and "new messages" cue. Port and enhance the PoC `MessageList` + `useScrollPager`.

**Acceptance Criteria**:
- [ ] Renders messages from newest to oldest, anchored at bottom
- [ ] Lazy pagination: scroll to top → load 30 more messages (PoC `useScrollPager` pattern)
- [ ] Scroll position restoration after loading older messages
- [ ] Auto-scroll to bottom when new messages arrive (if already at bottom)
- [ ] "New messages ↓" floating button when scrolled up and new message arrives
- [ ] Date dividers between messages on different days (`DateDivider`)
- [ ] Empty state: "No messages yet" placeholder
- [ ] Loading spinner at top when loading older messages
- [ ] `ResizeObserver` for dynamic content adjustments
- [ ] Smooth scroll behavior with `scroll-behavior: smooth`

**Files to Create/Edit**:
- `apps/hermes-chat-final/src/components/chat/MessageList.tsx`
- `apps/hermes-chat-final/src/hooks/useScrollPager.ts`
- `apps/hermes-chat-final/src/components/chat/DateDivider.tsx`
- `apps/hermes-chat-final/src/components/chat/NewMessagesCue.tsx`

**Stack Notes**: PoC reference: `apps/hermes-chat/src/components/chat/MessageList.tsx` (70 lines), `apps/hermes-chat/src/hooks/useScrollPager.ts` (104 lines). Fix `any` types in useScrollPager.

**Doc Reference**: PoC MessageList.tsx, PoC useScrollPager.ts, Frontend Architect §Chat Experience

---

### [ ] Task 3.2.3: `MessageBubble` component

**Description**: Individual message bubble with inbound/outbound variants, delivery status, encrypted message handling, file attachment preview, text selection, and long-press actions.

**Acceptance Criteria**:
- [ ] Inbound (left-aligned, gray) vs outbound (right-aligned, dark) layout
- [ ] Delivery status: `DeliveryStatus` component with 5-stage HF pipeline indicator (Composed → Queued → Transmitting → Transmitted → Delivered)
- [ ] Encrypted message: shows lock icon, "Unlock message" button → `PasswordDialog` → decrypt
- [ ] File attachment: `FileAttachment` component for images, audio, generic files
- [ ] Timestamp with `formatTime`
- [ ] Secure indicator (lock icon) on encrypted messages
- [ ] `DeleteMessageButton` on own messages (with `ConfirmDialog`)
- [ ] Text is selectable (not `user-select: none`)
- [ ] Long-press: context menu (copy text) — mobile only
- [ ] Loading state while decrypting (spinner)
- [ ] Wrong password feedback ("Incorrect password")

**Files to Create/Edit**:
- `apps/hermes-chat-final/src/components/chat/MessageBubble.tsx`
- `apps/hermes-chat-final/src/components/chat/FileAttachment.tsx`
- `apps/hermes-chat-final/src/components/DeliveryStatus.tsx`
- `apps/hermes-chat-final/src/components/DeleteMessageButton.tsx`

**Stack Notes**: PoC reference: `apps/hermes-chat/src/components/chat/MessageBubble.tsx` (124 lines). Keep the decryption flow pattern (PasswordDialog + fetch /api/messages/uncrypt/:id).

**Doc Reference**: PoC MessageBubble.tsx, Frontend Architect §Chat Experience

---

### [ ] Task 3.2.4: `MessageInput` component

**Description**: Text input with file attachment, encryption toggle, and send button. File type validation, caption support, paste-from-clipboard.

**Acceptance Criteria**:
- [ ] Text input field with placeholder ("Message to [station]")
- [ ] File attachment button (paperclip icon) → hidden file input
- [ ] Encryption toggle (lock icon) → shows/hides password field
- [ ] Send button (arrow/send icon), disabled when text empty and no file
- [ ] File validation: all files ≤500KB (HF-aware limit per ADR-004)
- [ ] Warning message for files approaching the limit: "This file is 480KB. Estimated HF transmission time: ~65 minutes. Are you sure you want to send this over HF?"
- [ ] Error message for oversized files: "File too large for HF transmission (max 500KB). Reduce size or send via alternative channel." (i18n)
- [ ] Paste-from-clipboard: intercept `paste` event for images
- [ ] Caption input when file attached (placeholder: "Add a caption…")
- [ ] Sending state: button shows spinner, input disabled
- [ ] Password field: toggle visibility (eye icon), clear (X icon)
- [ ] Accessible: all buttons have `aria-label`, keyboard accessible

**Files to Create/Edit**:
- `apps/hermes-chat-final/src/components/chat/MessageInput.tsx`

**Stack Notes**: PoC reference: `apps/hermes-chat/src/components/chat/MessageInput.tsx` (150 lines). Add paste-from-clipboard support. Enhance file validation messages.

**Doc Reference**: PoC MessageInput.tsx, Frontend Architect §Media Handling

---

### [ ] Task 3.2.5: `AttachmentPreview` component

**Description**: Pre-send preview of selected file. Shows thumbnail, filename, file size. Allows removing the file before sending. Shows password confirmation for encrypted files.

**Acceptance Criteria**:
- [ ] Image preview: thumbnail generated via `URL.createObjectURL`
- [ ] Generic file preview: file icon + filename + size
- [ ] Remove button (X) to clear file selection
- [ ] Password field visible if encryption is toggled
- [ ] File size displayed in human-readable format (kB, MB)
- [ ] Responsive: preview bar above message input

**Files to Create/Edit**:
- `apps/hermes-chat-final/src/components/chat/AttachmentPreview.tsx`

**Stack Notes**: PoC reference: `apps/hermes-chat/src/components/chat/AttachmentPreview.tsx`. Add file size display.

**Doc Reference**: PoC AttachmentPreview.tsx

---

### [ ] Task 3.2.6: `ChatHeader` component

**Description**: Header bar for the chat screen. Shows station name (alias), online/offline status, back button, and station info.

**Acceptance Criteria**:
- [ ] Back button (←) → navigates to conversation list
- [ ] Station name display (alias if available, otherwise callsign)
- [ ] Last-heard status indicator: "Last heard: 14:30 UTC (4 hours ago)" from WS `station.lastHeard` event — no green/gray presence dot (HF incompatible)
- [ ] Tap header → navigate to station info/detail (future)
- [ ] Refresh button (manual message fetch)

**Files to Create/Edit**:
- `apps/hermes-chat-final/src/components/chat/ChatHeader.tsx`

**Stack Notes**: PoC reference: `apps/hermes-chat/src/components/chat/ChatHeader.tsx`. Replace online status with last-heard timestamp from WebSocket.

**Doc Reference**: ADR-002 §Event Catalog (station.lastHeard)

---

## Week 8: Chat Advanced — Offline, Files, Real-Time

### [ ] Task 3.3.1: `useOfflineQueue` hook

**Description**: Implement the IndexedDB-backed offline message queue per ADR-004 (5-stage HF delivery pipeline). Hooks into `WebSocketProvider` `connectionState` to auto-drain on reconnect.

**Acceptance Criteria**:
- [ ] `useOfflineQueue()` returns: `{ queueLength, pendingMessages, isDraining, retryMessage, removeMessage }`
- [ ] When backend unreachable, `sendMessage` stores payload in IndexedDB with UUID, status: `composed`
- [ ] On `connectionState` transition to `connected`, auto-drains queue (FIFO)
- [ ] Successful backend acceptance: status → `queued` (awaiting HF transmission window)
- [ ] WS `radioDaemon.hfStatus` event updates status: `transmitting` (animated radio waves icon)
- [ ] WS `message.synced` event: status → `transmitted` (awaiting remote ACK)
- [ ] WS `message.delivered` event: status → `delivered` (green double checkmark)
- [ ] Failed send: increment `retryCount`; after backend retries exhausted → `status: 'failed'` (red X with retry)
- [ ] UUID-based idempotency prevents duplicate sends
- [ ] Queue persists across page reloads (IndexedDB)
- [ ] Unit tested with mocked IndexedDB

**Files to Create/Edit**:
- `apps/hermes-chat-final/src/hooks/useOfflineQueue.ts`
- `apps/hermes-chat-final/src/hooks/useOfflineQueue.test.ts`
- `apps/hermes-chat-final/src/lib/offlineDb.ts` — IndexedDB wrapper

**Stack Notes**: Use `idb` library for Promise-based IndexedDB. Schema per ADR-004 §Queue Schema. Delivery status per ADR-004 §HF Delivery Status Model.

**Doc Reference**: ADR-004 §Queue Flow, ADR-004 §Queue Schema, ADR-004 §HF Delivery Status Model

---

### [ ] Task 3.3.2: `useSendMessage` hook (enhanced with offline)

**Description**: Port and enhance the PoC `useSendMessage` hook. Integrates offline queue, optimistic insert, file upload pipeline, and encryption. Replaces raw `fetch` with `@hermes/api` client.

**Acceptance Criteria**:
- [ ] `sendMessage({ text, file, pass, orig })`:
  - If online: POST to API immediately
  - If offline: enqueue via `useOfflineQueue`
- [ ] Optimistic insert: message appears in list with `draft: true`, `id: -userId`, and 5-stage delivery status indicator (starts at `composed`)
- [ ] On server confirmation: replace optimistic with real message, status transitions to `queued`
- [ ] UI feedback: "Message queued for transmission" — not "Message sent!" (HF-aware per ADR-004)
- [ ] File upload: `POST /api/ufile` (multipart) → get file id → `POST /api/messages` with fileid
- [ ] Encrypted messages: `secure: true`, `pass` field included
- [ ] `sending` flag for UI loading state
- [ ] Error handling: `setError` with i18n messages

**Files to Create/Edit**:
- `apps/hermes-chat-final/src/hooks/useSendMessage.ts`
- `apps/hermes-chat-final/src/hooks/useSendMessage.test.ts`

**Stack Notes**: PoC reference: `apps/hermes-chat/src/hooks/useSendMessage.ts` (90 lines). Enhance with offline queue integration. UI feedback per ADR-004 §UI Feedback (HF-Aware).

**Doc Reference**: ADR-004, PoC useSendMessage.ts

---

### [ ] Task 3.3.3: Message delivery real-time sync

**Description**: Listen to WebSocket `message.delivered`, `message.synced`, and `radioDaemon.hfStatus` events to update delivery status through the 5-stage HF pipeline in real-time (without page refresh).

**Acceptance Criteria**:
- [ ] `radioDaemon.hfStatus` → updates message status to `transmitting` when currentTransmission matches a local message UUID
- [ ] `message.synced` → marks message as `transmitted` (awaiting remote ACK)
- [ ] `message.delivered` → marks message as `delivered` (green double checkmark)
- [ ] UI re-renders affected `MessageBubble` components with updated `DeliveryStatus` component
- [ ] Optimistic message reconciliation: when server sends `message.new` with our UUID, replace optimistic message
- [ ] `station.lastHeard` → updates ChatHeader last-heard timestamp

**Files to Edit**:
- `apps/hermes-chat-final/src/hooks/useChatData.ts` — add WS subscriptions

**Doc Reference**: ADR-002 §Event Catalog, ADR-004 §HF Delivery Status Model

---

### [ ] Task 3.3.4: File upload pipeline

**Description**: Complete file upload flow: file selection → validation → preview → upload with progress → attach to message → send.

**Acceptance Criteria**:
- [ ] File input accepts: images, audio, PDF, text files
- [ ] Client-side validation: type check, size check (all files ≤500KB per ADR-004 HF limits)
- [ ] Upload progress indicator (progress bar) via `XMLHttpRequest.upload.onprogress`
- [ ] Upload to `POST /api/ufile` (multipart form data)
- [ ] Server returns `{ id, filename, mimetype }`
- [ ] File metadata attached to message: `{ file: filename, fileid: id, mimetype }`
- [ ] Encrypted file upload: `pass` field included in multipart form
- [ ] Error handling: upload failure → retry button, clear file on cancel

**Files to Create/Edit**:
- `apps/hermes-chat-final/src/app/api/ufile/route.ts` — proxy to backend
- `apps/hermes-chat-final/src/lib/upload.ts` — upload with progress
- `apps/hermes-chat-final/src/components/chat/UploadProgress.tsx` — progress bar

**Stack Notes**: PoC reference: `apps/hermes-chat/src/app/api/ufile/route.ts`, `apps/hermes-chat/src/hooks/useSendMessage.ts` lines 17–25.

**Doc Reference**: Frontend Architect §Media Handling & Upload UX

---

### [ ] Task 3.3.5: Encrypted message flow (complete)

**Description**: Complete the end-to-end encrypted message flow: send encrypted → receive encrypted → decrypt on demand. Port PoC pattern with enhancements.

**Acceptance Criteria**:
- [ ] Send: toggle encryption → enter password → message sent with `secure: true` and `pass`
- [ ] Receive: encrypted message shows lock icon + "Unlock message" button
- [ ] Decrypt: `PasswordDialog` → `POST /api/messages/uncrypt/:id` with password → display decrypted text
- [ ] Wrong password: error feedback, retry
- [ ] Decrypted state persists per-session (cleared on logout or page refresh)
- [ ] Decrypted file: password passed to file download/display endpoint
- [ ] Visual indicator on encrypted messages: lock icon in bubble footer

**Files to Create/Edit**:
- `apps/hermes-chat-final/src/app/api/messages/uncrypt/[id]/route.ts`
- `apps/hermes-chat-final/src/components/chat/EncryptedMessage.tsx`

**Stack Notes**: PoC reference: `apps/hermes-chat/src/components/chat/MessageBubble.tsx` lines 32–60, `apps/hermes-chat/src/app/api/messages/uncrypt/[id]/route.ts`.

**Doc Reference**: PoC MessageBubble.tsx decryption flow, Frontend Architect §Client-Side Security

---

## Week 9: Chat Polish — Radio Info, Station Discovery, E2E

### [ ] Task 3.4.1: Radio info dashboard

**Description**: Build the radio information page showing system status, caller log, and hardware status. Port PoC `SysInfo` and `CallerList` components.

**Acceptance Criteria**:
- [ ] System info: nodename, domain, version, uptime (from `GET /api/sys/status`)
- [ ] Caller list: recent radio callers with timestamp, callsign, duration
- [ ] Auto-refresh on WS `caller.new` event
- [ ] Manual refresh button
- [ ] Loading spinner, empty state ("No recent callers"), error state
- [ ] All strings from `next-intl`
- [ ] Accessible: table/list semantics

**Files to Create/Edit**:
- `apps/hermes-chat-final/src/app/radio-info/page.tsx`
- `apps/hermes-chat-final/src/components/radio/SysInfo.tsx`
- `apps/hermes-chat-final/src/components/radio/CallerList.tsx`
- `apps/hermes-chat-final/src/app/api/sys/route.ts` — proxy to backend
- `apps/hermes-chat-final/src/app/api/caller/route.ts` — proxy to backend
- `apps/hermes-chat-final/messages/en.json` — `radioInfo` namespace
- `apps/hermes-chat-final/messages/pt.json` — `radioInfo` namespace

**Stack Notes**: PoC reference: `apps/hermes-chat/src/components/radio/SysInfo.tsx`, `apps/hermes-chat/src/components/radio/CallerList.tsx`, `apps/hermes-chat/src/app/home/radio-info/page.tsx`.

**Doc Reference**: PoC radio components

---

### [ ] Task 3.4.2: Station discovery / new chat

**Description**: Build the station picker for starting new conversations. Lists known stations, filters already-active conversations, search by alias/callsign.

**Acceptance Criteria**:
- [ ] Fetches station list from `GET /api/stations`
- [ ] Filters out stations already in active conversations (via `buildConversations`)
- [ ] Search input filters by alias or callsign (debounced 300ms)
- [ ] Each station shows: avatar with initials, alias or callsign
- [ ] Tap station → navigate to `/chat/[station]`
- [ ] Loading, empty ("No stations available"), error states
- [ ] Back button to conversation list
- [ ] All strings from `next-intl`

**Files to Create/Edit**:
- `apps/hermes-chat-final/src/app/new-chat/page.tsx`
- `apps/hermes-chat-final/src/app/api/stations/route.ts` — proxy to backend
- `apps/hermes-chat-final/messages/en.json` — `newChat` namespace
- `apps/hermes-chat-final/messages/pt.json` — `newChat` namespace

**Stack Notes**: PoC reference: `apps/hermes-chat/src/app/home/new-chat/page.tsx` (126 lines). Enhance with flat list + search.

**Doc Reference**: PoC new-chat/page.tsx

---

### [ ] Task 3.4.3: `ConversationItem` component

**Description**: Reusable conversation list item showing avatar, last message preview, timestamp, unread badge, and delivery status.

**Acceptance Criteria**:
- [ ] Avatar: circle with initials (up to 2 chars)
- [ ] Station name: alias (bold) or callsign
- [ ] Last message preview: truncated text (1 line), attachment icon if file
- [ ] Relative timestamp: "2 min ago", "yesterday", "12/06/2026" (older than 7 days)
- [ ] Unread badge: colored dot with count (if >0)
- [ ] Delivery status: 5-stage HF delivery pipeline indicator if last message is mine (per ADR-004)
- [ ] Tap → navigate to chat
- [ ] Long-press → context menu: delete conversation, mark as read (future)
- [ ] Accessible: role="button", aria-label with station name

**Files to Create/Edit**:
- `apps/hermes-chat-final/src/components/home/ConversationItem.tsx`
- `apps/hermes-chat-final/src/lib/formatting.ts` — relative time helpers

**Stack Notes**: PoC reference: `apps/hermes-chat/src/components/home/ConversationItem.tsx`. Use `Intl.RelativeTimeFormat` for relative timestamps.

**Doc Reference**: PoC ConversationItem.tsx, Frontend Architect §Chat Experience

---

### [ ] Task 3.4.4: Chat-specific i18n

**Description**: Complete all `en.json` and `pt.json` message files for the chat app. Includes home screen, chat screen, radio info, new chat, and shared UI.

**Acceptance Criteria**:
- [ ] `home` namespace: searchPlaceholder, noConversations, loadError, logout, loggedInAs, refresh
- [ ] `chat` namespace: messagePlaceholder, captionPlaceholder, noMessages, loadError, connectionError, fileSendError, fileTooLargeMedia, fileTooLargeOther, attachFile, send, togglePass, passPlaceholder, showPass, hidePass, removePass, enterPassword, unlock, unlockMessage, wrongPassword, deleteMessage, cancel
- [ ] `newChat` namespace: selectStation, stationSearchPlaceholder, noStations, back
- [ ] `radioInfo` namespace: title, back, menuLabel, noCallers
- [ ] `theme` namespace: toggle, lightMode, darkMode
- [ ] All keys exist in both `en.json` and `pt.json`

**Files to Edit**:
- `apps/hermes-chat-final/messages/en.json`
- `apps/hermes-chat-final/messages/pt.json`

**Stack Notes**: PoC reference: `apps/hermes-chat/messages/en.json`, `apps/hermes-chat/messages/pt.json`. Expand with new strings for enhanced UX.

---

### [ ] Task 3.4.5: Chat E2E tests

**Description**: Write Playwright E2E tests for critical chat flows. Include offline queue test and real-time delivery test.

**Acceptance Criteria**:
- [ ] Test 1: Login → conversation list → open chat → send text message → verify in list → receive response
- [ ] Test 2: Send file attachment → verify file preview → verify file download
- [ ] Test 3: Send encrypted message → verify lock icon → decrypt → verify decrypted text
- [ ] Test 4: Offline queue: disconnect → send 3 messages → reconnect → verify all 3 sent
- [ ] Test 5: Delete message → verify removal → verify undo (if implemented)
- [ ] Test 6: Real-time delivery: open two chat windows → send from one → verify appears in other

**Files to Create/Edit**:
- `apps/hermes-chat-final/e2e/chat.spec.ts`
- `docs/testing/chat-manual-checklist.md`

**Stack Notes**: Mock `hermes-backend` REST API with Playwright route interception. Mock `hermes-radio-daemon` WebSocket with a test WS server.

---

## Phase Quality Gates

- [ ] `npm run build` passes with zero TS errors
- [ ] `npm test` passes with >80% coverage on chat hooks and utilities
- [ ] Full chat flow: login → conversation list → open chat → send text → receive → send file → encrypted → delete
- [ ] Offline queue: send 3 messages while offline → reconnect → all sent in FIFO order
- [ ] Scroll pager: 200+ messages, scroll up loads older in 30-message chunks, smooth restoration
- [ ] Real-time: incoming message appears without manual refresh, delivery checkmarks update via WS
- [ ] Conversation list updates in real-time (new message from known station updates last message preview)
- [ ] File upload: progress bar, success, file attachment displayed in chat
- [ ] Encrypted messages: lock icon, decrypt on demand, wrong password feedback
- [ ] All i18n keys in `en.json` and `pt.json` — switch language, all labels update
- [ ] Radio info dashboard renders system status, caller log
- [ ] Station discovery: search, filter, navigate to new chat
- [ ] All components pass keyboard navigation
- [ ] All buttons/labels have `aria-label` where needed
- [ ] No `console.log` in production code paths