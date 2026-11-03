/**
 * Shared TypeScript interfaces for the HERMES frontend.
 *
 * These types represent the canonical shapes of data flowing between the
 * frontend and the hermes-radio-daemon station API (`/api/v2` REST and the
 * `hermes.v1` WebSocket), as specified in `api/spec/api-rest.yaml` and
 * `api/spec/api-ws.yaml`.
 *
 * All types are re-exported from packages/api/src/index.ts.
 */

/** GPS fix quality, as reported by hermes-radio-daemon (`Gps.fix`). */
export type GpsFixQuality = 'none' | '2d' | '3d';

/**
 * GPS logging settings (hermes-radio-daemon `GpsSettings`).
 * All fields are optional because updates are partial (`PATCH /api/v2/gps/settings`).
 */
export interface GpsSettings {
  logging?: boolean;
  sample_interval_s?: number;
  file_period_s?: number;
  email?: string | null;
  report?: {
    /** Broadcast this station's position. Default off. */
    enabled?: boolean;
    /** How often to report, in seconds (default 900). */
    interval_s?: number;
  };
}

/**
 * The station's current position, fix and logging settings, as returned by
 * `GET /api/v2/gps` and carried by the `gps` WebSocket topic (`change: self`).
 */
export interface Gps {
  fix: GpsFixQuality;
  latitude: number | null;
  longitude: number | null;
  altitude_m: number | null;
  at: string | null;
  settings: GpsSettings;
}

/**
 * A single recorded position (breadcrumb point), as listed by
 * `GET /api/v2/gps/trip` (`GpsPoint` in api-rest.yaml).
 */
export interface GpsPoint {
  at: string;
  latitude: number;
  longitude: number;
  altitude_m?: number | null;
  accuracy_m?: number | null;
}

/**
 * A recorded trip (hermes-radio-daemon `Trip`).
 */
export interface Trip {
  id: number;
  started_at: string;
  /** Null while the trip is open. */
  ended_at?: string | null;
  point_count?: number;
}

/**
 * Another station's last-known position, as listed by `GET /api/v2/gps/stations`
 * and carried by the `gps` WebSocket topic (`change: peers`).
 */
export interface GpsStationPosition {
  uucp_name: string;
  alias?: string | null;
  display_name?: string | null;
  latitude: number | null;
  longitude: number | null;
  altitude_m?: number | null;
  position_at?: string | null;
}

/**
 * Data payload of the `gps` WebSocket topic. The snapshot is the station's own
 * position (`change: self`); `change: peers` carries other stations' positions.
 */
export interface GpsEvent {
  change: 'self' | 'peers';
  gps?: Gps;
  stations?: GpsStationPosition[];
}

/**
 * Radio/transceiver status derived from the hermes-radio-daemon `radio.state`
 * WebSocket topic.
 *
 * This is a forward-looking shape: `frequency` maps from the daemon's
 * `frequency_hz`; `power` and `lastHamSync` have no daemon equivalent yet, so
 * they stay `null` and consumers render a neutral "—" display. All fields are
 * optional/nullable for resilience.
 */
export interface RadioStatus {
  /** Radio power state (e.g. 'on' | 'off' | 'standby'); null from the daemon. */
  power: string | null;
  /** Current operating frequency in Hz (e.g. 7100000 for 7.100 MHz) */
  frequency: number | null;
  /** Last successful sync with the HAM messaging relay (ISO timestamp); null from the daemon. */
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
