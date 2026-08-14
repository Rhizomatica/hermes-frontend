import type { StyleSpecification } from 'maplibre-gl';
import { getMapTokens } from '@hermes/tailwind-config/map-tokens';

/**
 * Returns a Maplibre GL style specification for light or dark theme.
 *
 * Pure function — no side effects. Call this when the theme changes
 * and pass the result to map.setStyle(). Colors are sourced from
 * the theme-aware map tokens in `@hermes/tailwind-config/map-tokens`.
 *
 * @example
 * import { buildStyle } from '@/lib/mapStyle';
 * map.setStyle(buildStyle(theme === 'dark'));
 */
export function buildStyle(isDark: boolean): StyleSpecification {
  const tokens = getMapTokens(isDark);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return {
    version: 8,
    glyphs: '/fonts/{fontstack}/{range}.pbf',
    sources: {
      openmaptiles: {
        type: 'vector',
        url: `pmtiles://${origin}/brazil.pmtiles`,
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': tokens.background,
        },
      },
    ],
  };
}
