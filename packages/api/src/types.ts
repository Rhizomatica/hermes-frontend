/**
 * Shared TypeScript interfaces for the HERMES frontend.
 *
 * These types represent the canonical shapes of data flowing
 * between the frontend and backend systems (hermes-backend REST API
 * and hermes-radio-daemon WebSocket).
 *
 * All types are re-exported from packages/api/src/index.ts.
 */

/** GPS position from hermes-radio-daemon gps.position event or GET /api/gps */
export interface GpsPosition {
  latitude: number;
  longitude: number;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: string;
}

/** GPS fix quality from hermes-radio-daemon gps.fix event */
export interface GpsFix {
  quality: number;
  satellites: number;
  hdop: number;
}

/**
 * Radio/transceiver status from hermes-radio-daemon `radio.status` event.
 *
 * This is a forward-looking shape: the backend event may not be wired up yet,
 * in which case consumers should treat the value as `null` and fall back to a
 * neutral "—" display. All fields are optional/nullable for resilience.
 */
export interface RadioStatus {
  /** Radio power state (e.g. 'on' | 'off' | 'standby') */
  power: string | null;
  /** Current operating frequency in Hz (e.g. 7100000 for 7.100 MHz) */
  frequency: number | null;
  /** Last successful sync with the HAM messaging relay (ISO timestamp) */
  lastHamSync: string | null;
}

/**
 * A single Hermes message.
 *
 * `inbox` is true for messages received by the local station and false for
 * messages the local station sent. `dest` may be a single string or an array
 * of recipient addresses (the canonical form is always an array — use
 * `destArray()` from @hermes/api to normalize).
 */
export interface Message {
  id: number;
  inbox: boolean;
  draft: boolean;
  orig: string;
  dest: string[] | string;
  name: string;
  text: string | null;
  file: string | null;
  fileid: string | null;
  mimetype: string | null;
  secure: boolean;
  sent_at: string;
  synced: boolean;
  unread: boolean;
}

/**
 * A grouped conversation with a remote station.
 *
 * `station` is the canonical alias key (see `canonicalize()`), `lastMessage`
 * is the most recent message in the conversation, and `unreadCount` is the
 * number of unread inbound messages (server-provided when available,
 * otherwise derived via `buildConversations()`).
 */
export interface Conversation {
  station: string;
  lastMessage: Message;
  unreadCount: number;
}

/** A known radio station. */
export interface Station {
  name: string;
  alias: string | null;
  status: string;
}

/**
 * The authenticated Hermes user.
 *
 * Matches the backend `GET /users/me` response (hermes-backend `users`
 * table with `passwordHash` stripped). This is the canonical shape.
 */
export interface HermesUser {
  id: string; // UUID
  callsign: string;
  displayName: string;
  email: string | null;
  role: string; // 'admin' | 'operator' | 'user' | 'readonly'
  status: string; // 'active' | 'suspended' | 'pending'
  avatarPath: string | null;
  metadata: string; // JSON-encoded string
  locale: string; // 'en' | 'es' | 'pt-BR'
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
}
