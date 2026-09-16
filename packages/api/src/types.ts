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