import type { StyleSpecification } from 'maplibre-gl';
import { getMapTokens } from '@hermes/tailwind-config/map-tokens';

/**
 * Returns a Maplibre GL style specification for light or dark theme.
 *
 * Pure function — no side effects. Call this when the theme changes
 * and pass the result to map.setStyle(). Colors are sourced from
 * the theme-aware map tokens in `@hermes/tailwind-config/map-tokens`.
 *
 * The vector layers target the Protomaps OpenStreetMap schema
 * (source layers: earth, landcover, landuse, water, roads, boundaries)
 * produced by build.protomaps.com. The `kind` field classifies features
 * within each source layer (e.g. roads kind = highway / major_road / …).
 *
 * @example
 * import { buildStyle } from '@/lib/mapStyle';
 * map.setStyle(buildStyle(theme === 'dark'));
 */

// PMTiles file must be placed at /public/brazil.pmtiles
// Override with NEXT_PUBLIC_PMTILES_URL env variable (relative path or absolute URL)
const PMTILES_RAW = process.env.NEXT_PUBLIC_PMTILES_URL ?? '/brazil.pmtiles';

export function buildStyle(isDark: boolean): StyleSpecification {
  const tokens = getMapTokens(isDark);
  // pmtiles:// + /brazil.pmtiles → pmtiles:///brazil.pmtiles → the pmtiles
  // Protocol strips "pmtiles://" and the browser resolves the rest against origin.
  const tilesUrl = `pmtiles://${PMTILES_RAW}`;

  return {
    version: 8,
    // Fully offline — no glyphs or sprites, so no external URLs.
    sources: {
      openmaptiles: {
        type: 'vector',
        url: tilesUrl,
        attribution:
          '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': tokens.background },
      },
      {
        id: 'earth',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'earth',
        paint: { 'fill-color': tokens.land },
      },
      {
        id: 'landcover',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        paint: { 'fill-color': tokens.land, 'fill-opacity': 0.7 },
      },
      {
        id: 'landuse',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landuse',
        paint: { 'fill-color': tokens.land, 'fill-opacity': 0.45 },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'water',
        paint: { 'fill-color': tokens.water },
      },
      {
        id: 'roads-minor',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'roads',
        minzoom: 10,
        filter: [
          'none',
          ['==', 'kind', 'highway'],
          ['==', 'kind', 'major_road'],
        ],
        paint: {
          'line-color': tokens.road,
          'line-opacity': 0.8,
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10,
            0.4,
            15,
            2,
          ],
        },
      },
      {
        id: 'roads-major',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'roads',
        filter: [
          'any',
          ['==', 'kind', 'highway'],
          ['==', 'kind', 'major_road'],
        ],
        paint: {
          'line-color': tokens.road,
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5,
            0.6,
            12,
            4,
          ],
        },
      },
      {
        id: 'boundaries-region',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'boundaries',
        minzoom: 4,
        filter: ['==', 'kind', 'region'],
        paint: {
          'line-color': tokens.road,
          'line-width': 0.7,
          'line-opacity': 0.6,
        },
      },
      {
        id: 'boundaries-country',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'boundaries',
        filter: ['==', 'kind', 'country'],
        paint: {
          'line-color': tokens.label,
          'line-width': 0.5,
        },
      },
    ],
  };
}