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
 * Matches the station API's `User` schema (hermes-radio-daemon
 * `api-rest.yaml`): `GET /api/v2/session` returns a `Session` whose `user`
 * field is this shape (a `passwordHash` is never present).
 */
export interface HermesUser {
  id: number;
  username: string;
  display_name: string | null;
  avatar: string | null;
  role: HermesRole;
  locale: string; // 'en' | 'es' | 'pt-BR' | 'fr'
  phone: string | null;
  location: string | null;
  disabled: boolean;
  lxmf_address: unknown | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Station API roles, least to most privileged (api-rest.yaml `Role`). */
export type HermesRole = 'readonly' | 'user' | 'operator' | 'admin';
