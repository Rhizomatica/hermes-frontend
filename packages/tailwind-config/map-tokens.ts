/**
 * Theme-aware map color tokens for MapLibre GL styles.
 *
 * These tokens keep offline map rendering consistent with the
 * HERMES design system (orange-500 accent) across light and dark
 * themes. Consumed by `buildStyle()` in `apps/hermes-gps-final/src/lib/mapStyle.ts`.
 *
 * Values reference Tailwind's orange palette (ADR-005 §Map Aesthetics).
 */

export interface MapThemeTokens {
  /** Canvas / water background color */
  background: string;
  /** Land / terrain fill color */
  land: string;
  /** Water body fill color */
  water: string;
  /** Primary road / line color */
  road: string;
  /** Label / text color */
  label: string;
  /** Station marker accent (orange-500) */
  marker: string;
  /** Breadcrumb trail recent point (orange-500) */
  trailRecent: string;
  /** Breadcrumb trail midpoint (orange-400) */
  trailMid: string;
  /** Breadcrumb trail old point (orange-200) */
  trailOld: string;
}

/** Light theme tokens */
export const lightMapTokens: MapThemeTokens = {
  background: '#f8fafc',
  land: '#e2e8f0',
  water: '#bae6fd',
  road: '#cbd5e1',
  label: '#0f172a',
  marker: '#f97316',
  trailRecent: '#f97316',
  trailMid: '#fb923c',
  trailOld: '#fed7aa',
};

/** Dark theme tokens */
export const darkMapTokens: MapThemeTokens = {
  background: '#0f172a',
  land: '#1e293b',
  water: '#0c4a6e',
  road: '#334155',
  label: '#e2e8f0',
  marker: '#f97316',
  trailRecent: '#f97316',
  trailMid: '#fb923c',
  trailOld: '#fed7aa',
};

/**
 * Resolve the map token set for a given theme.
 *
 * @param isDark Whether the dark theme is active
 * @returns The matching token set
 */
export function getMapTokens(isDark: boolean): MapThemeTokens {
  return isDark ? darkMapTokens : lightMapTokens;
}