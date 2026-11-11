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
}

/**
 * A recorded GPS position file (hermes-radio-daemon `GpsFile`), as listed by
 * `GET /api/v2/gps/files`. Files are produced every `file_period_s` while
 * logging is enabled and are emailed to `GpsSettings.email` once finished.
 */
export interface GpsFile {
  /** File name (e.g. `positions-20260812.gpx`). */
  name: string;
  /** Size in bytes. */
  size_bytes: number;
  /** When the file was finished (ISO 8601 UTC). */
  created_at: string;
}

/**
 * The station's position-beacon state, returned by `GET /api/v2/gps/beacon`
 * and by `POST /api/v2/gps/sos` / `DELETE /api/v2/gps/sos` (hermes-radio-daemon
 * `Beacon` schema in api-rest.yaml).
 *
 * `emergency` is `0` when no SOS is active, or the distress code set by SOS
 * (1 distress, 2 medical, 3 fire, … per docs/BEACON-FORMAT.md §7).
 */
export interface Beacon {
  enabled: boolean;
  interval_s: number;
  callsign: string;
  station_latitude: number | null;
  station_longitude: number | null;
  emergency_interval_s: number;
  emergency: number;
  running: boolean;
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
 * A trip together with its recorded positions (breadcrumb), as returned by
 * `GET /api/v2/gps/trip` (current trip) and `GET /api/v2/gps/trips/{trip_id}`.
 */
export interface TripPoints {
  trip: Trip;
  /** Breadcrumb points, oldest first. */
  data: GpsPoint[];
  next_cursor?: string | null;
}

/**
 * The list response of `GET /api/v2/gps/trips` (recorded trips, newest first).
 */
export interface TripsResponse {
  data: Trip[];
  next_cursor?: string | null;
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
 * A station this one can reach, with its last-known position, as listed by
 * `GET /api/v2/gps/stations` (hermes-radio-daemon `Station`). Stations with no
 * known position are still listed, with null position fields.
 */
export interface GpsStation {
  /** UUCP system name (the station's callsign). */
  uucp_name: string;
  /** Whether the station is enabled in the UUCP configuration. */
  enabled: boolean;
  /** Last-known latitude, or null when unknown. */
  latitude: number | null;
  /** Last-known longitude, or null when unknown. */
  longitude: number | null;
  /** Last-known altitude in metres, or null. */
  altitude_m?: number | null;
  /** When the last-known position was reported. */
  position_at?: string | null;
  /** Where the last-known position came from, or null when unknown. */
  position_source?: 'gps' | 'manual' | 'estimated' | null;
}

/** The list response of `GET /api/v2/gps/stations`. */
export interface GpsStationsResponse {
  data: GpsStation[];
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
 * WebSocket topic (`RadioState` in api-rest.yaml). Only the fields the GPS
 * panel surfaces are carried; all are nullable for resilience while the
 * subscription is connecting or a field is absent.
 */
export interface RadioStatus {
  /** Whether the station is transmitting (`tx`). */
  tx: boolean | null;
  /** Current operating frequency in Hz (e.g. 7100000 for 7.100 MHz). */
  frequency: number | null;
  /** Operating mode (e.g. USB, LSB, FM). */
  mode: string | null;
  /** TX power as a percentage (0-100). */
  power: number | null;
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
