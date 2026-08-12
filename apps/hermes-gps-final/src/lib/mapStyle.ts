import type { StyleSpecification } from 'maplibre-gl';

/**
 * Returns a Maplibre GL style specification for light or dark theme.
 *
 * Pure function — no side effects. Call this when the theme changes
 * and pass the result to map.setStyle().
 *
 * @example
 * import { buildStyle } from '@/lib/mapStyle';
 * map.setStyle(buildStyle(theme === 'dark'));
 */
export function buildStyle(isDark: boolean): StyleSpecification {
  return {
    version: 8,
    glyphs: '/fonts/{fontstack}/{range}.pbf',
    sources: {
      openmaptiles: {
        type: 'vector',
        url: `pmtiles://${window.location.origin}/brazil.pmtiles`,
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': isDark ? '#0f172a' : '#f8fafc',
        },
      },
    ],
  };
}