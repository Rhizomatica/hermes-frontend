'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import { buildStyle } from '@/lib/mapStyle';
import { getMapTokens } from '@hermes/tailwind-config/map-tokens';
import { Navigation } from 'lucide-react';
import type { GpsPosition } from '@hermes/api';

export interface MapViewProps {
  /** Latitude in decimal degrees */
  latitude: number | null;
  /** Longitude in decimal degrees */
  longitude: number | null;
  /** Heading in degrees (0-360, 0=north, clockwise) */
  heading: number | null;
  /** HDOP value for accuracy circle sizing */
  hdop: number | null;
  /** Whether to use dark theme */
  isDark: boolean;
  /** Breadcrumb trail positions (oldest → newest, up to 500) */
  breadcrumb?: GpsPosition[];
  /** Whether to show the breadcrumb trail */
  showBreadcrumb?: boolean;
  /** Callback when tile loading fails */
  onTileError?: () => void;
  /**
   * Increment this counter to re-center the map on the current position.
   * Changes from 0 → 1 → 2… trigger a fly-to animation.
   */
  recenterToken?: number;
}

/** Source ID for the breadcrumb line layer */
const BREADCRUMB_SOURCE = 'hermes-breadcrumb';
const BREADCRUMB_LAYER = 'hermes-breadcrumb-line';

// Register the pmtiles:// protocol handler with MapLibre (once per page load)
let protocolRegistered = false;
function ensureProtocol(): void {
  if (protocolRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol('pmtiles', protocol.tile.bind(protocol));
  protocolRegistered = true;
}

// Initial bearing (degrees, 0 = north) from one coordinate to another.
// Coordinates are [longitude, latitude] to match MapLibre conventions.
function bearing(from: [number, number], to: [number, number]): number {
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;
  const [lon1, lat1] = from;
  const [lon2, lat2] = to;
  const phi1 = lat1 * toRad;
  const phi2 = lat2 * toRad;
  const dLon = (lon2 - lon1) * toRad;

  const y = Math.sin(dLon) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);

  return (Math.atan2(y, x) * toDeg + 360) % 360;
}

/**
 * Offline-capable map component using Maplibre GL JS + PMTiles.
 *
 * Renders a full-screen map with the station position marker and
 * optional breadcrumb trail. Theme-aware (light/dark styles).
 * Error overlay when tiles cannot be loaded.
 *
 * @example
 * <MapView
 *   latitude={-23.45}
 *   longitude={-46.78}
 *   isDark={theme === 'dark'}
 *   breadcrumb={history}
 *   showBreadcrumb={true}
 *   onTileError={() => setTileError(true)}
 * />
 */
export default function MapView({
  latitude,
  longitude,
  heading,
  hdop,
  isDark,
  breadcrumb = [],
  showBreadcrumb = false,
  onTileError,
  recenterToken = 0,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const markerElRef = useRef<HTMLDivElement | null>(null);
  const [tileError, setTileError] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [indicator, setIndicator] = useState<{ angle: number; distanceKm: number } | null>(null);
  const t = useTranslations('gps');

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    ensureProtocol();

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(isDark),
      center: [longitude ?? -46.78, latitude ?? -23.45],
      zoom: 8,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(
      new maplibregl.ScaleControl({ unit: 'metric' }),
      'bottom-left',
    );

    map.on('load', () => {
      setMapReady(true);
    });

    map.on('error', () => {
      setTileError(true);
      onTileError?.();
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      markerElRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-center the map on the current position when the token changes.
  useEffect(() => {
    if (!recenterToken || !mapRef.current) return;
    if (latitude == null || longitude == null) return;
    mapRef.current.flyTo({
      center: [longitude, latitude],
      zoom: 10,
      duration: 1500,
      essential: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterToken]);

  // Update map style when theme changes
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    mapRef.current.setStyle(buildStyle(isDark));
  }, [isDark, mapReady]);

  // Update marker position, heading, and accuracy
  useEffect(() => {
    if (!mapRef.current || latitude == null || longitude == null) return;

    // Create marker if it doesn't exist
    if (!markerRef.current) {
      const el = document.createElement('div');
      el.className = 'hermes-marker';
      el.setAttribute('aria-label', 'Station GPS position');
      el.style.cssText = `
        width: 48px;
        height: 48px;
        cursor: pointer;
        transition: transform 0.5s ease;
      `;

      // Pulsing glow ring (animated)
      const pulseEl = document.createElement('div');
      pulseEl.className = 'hermes-marker-pulse';
      pulseEl.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        width: 100%;
        height: 100%;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        background: rgba(249, 115, 22, 0.35);
        pointer-events: none;
        will-change: transform, opacity;
        animation: hermes-pulse 2s ease-out infinite;
      `;
      el.appendChild(pulseEl);

      // Accuracy circle overlay (scaled by HDOP)
      const accuracyEl = document.createElement('div');
      accuracyEl.className = 'hermes-marker-accuracy';
      accuracyEl.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        height: 100%;
        border: 1.5px dashed #f97316;
        border-radius: 50%;
        opacity: 0.3;
        pointer-events: none;
        transition: transform 0.5s ease, opacity 0.3s ease;
      `;
      el.appendChild(accuracyEl);

      // SVG marker image
      const img = document.createElement('img');
      img.src = '/marker.svg';
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      img.style.cssText = `
        width: 48px;
        height: 48px;
        display: block;
        transition: transform 0.5s ease;
      `;
      img.className = 'hermes-marker-arrow';
      el.appendChild(img);

      markerElRef.current = el;

      markerRef.current = new maplibregl.Marker({
        element: el,
        anchor: 'center',
        offset: [0, 0],
      })
        .setLngLat([longitude, latitude])
        .addTo(mapRef.current);

      return;
    }

    // Update arrow rotation based on heading
    if (markerElRef.current && heading != null) {
      const arrow = markerElRef.current.querySelector('.hermes-marker-arrow') as HTMLElement | null;
      if (arrow) {
        arrow.style.transform = `rotate(${heading}deg)`;
      }
    }

    // Update accuracy circle scale based on HDOP
    if (markerElRef.current && hdop != null) {
      const accuracyCircle = markerElRef.current.querySelector('.hermes-marker-accuracy') as HTMLElement | null;
      if (accuracyCircle) {
        // Scale: HDOP 1.0 → 1.0x (no scaling), HDOP 5.0 → 2.0x (max), clamped
        const scale = Math.min(1 + (hdop - 1) * 0.25, 2.0);
        accuracyCircle.style.transform = `translate(-50%, -50%) scale(${Math.max(scale, 1.0)})`;
        accuracyCircle.style.opacity = hdop > 2.0 ? '0.5' : '0.3';
      }
    }

    // Fly to new position
    mapRef.current.flyTo({
      center: [longitude, latitude],
      duration: 1500,
      essential: true,
    });

    markerRef.current.setLngLat([longitude, latitude]);
  }, [latitude, longitude, heading, hdop]);

  // Show a direction indicator when the marker is outside the viewport.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const update = () => {
      if (latitude == null || longitude == null) {
        setIndicator(null);
        return;
      }

      const center = map.getCenter();
      const point = map.project([longitude, latitude]);
      const { width, height } = map.getContainer().getBoundingClientRect();
      const margin = 24;

      const inside =
        point.x >= margin &&
        point.x <= width - margin &&
        point.y >= margin &&
        point.y <= height - margin;

      if (inside) {
        setIndicator(null);
        return;
      }

      const angle = bearing([center.lng, center.lat], [longitude, latitude]);
      const distanceKm =
        new maplibregl.LngLat(center.lng, center.lat).distanceTo(
          new maplibregl.LngLat(longitude, latitude),
        ) / 1000;
      setIndicator({ angle, distanceKm });
    };

    update();
    map.on('move', update);
    map.on('zoom', update);
    map.on('resize', update);
    return () => {
      map.off('move', update);
      map.off('zoom', update);
      map.off('resize', update);
    };
  }, [latitude, longitude]);

  // ResizeObserver for responsive sizing
  const handleResize = useCallback(() => {
    if (mapRef.current) mapRef.current.resize();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(handleResize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [handleResize]);

  // Breadcrumb trail — add/update/remove GeoJSON line source + layer
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const map = mapRef.current;

    if (!showBreadcrumb || breadcrumb.length < 2) {
      if (map.getLayer(BREADCRUMB_LAYER)) {
        map.removeLayer(BREADCRUMB_LAYER);
      }
      if (map.getSource(BREADCRUMB_SOURCE)) {
        map.removeSource(BREADCRUMB_SOURCE);
      }
      return;
    }

    const tokens = getMapTokens(isDark);

    const coords: [number, number][] = breadcrumb.map((p) => [
      p.longitude,
      p.latitude,
    ]);

    const lineFeature: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: coords },
    };

    const pointFeatures: GeoJSON.Feature<GeoJSON.Point>[] = breadcrumb.map(
      (p, index) => ({
        type: 'Feature',
        properties: { index, timestamp: p.timestamp },
        geometry: {
          type: 'Point',
          coordinates: [p.longitude, p.latitude],
        },
      }),
    );

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [lineFeature, ...pointFeatures],
    };

    const source = map.getSource(BREADCRUMB_SOURCE) as
      | maplibregl.GeoJSONSource
      | undefined;

    if (source) {
      source.setData(geojson);
    } else {
      map.addSource(BREADCRUMB_SOURCE, { type: 'geojson', data: geojson });

      map.addLayer({
        id: BREADCRUMB_LAYER,
        type: 'line',
        source: BREADCRUMB_SOURCE,
        paint: {
          'line-color': tokens.trailRecent,
          'line-width': 3,
          'line-opacity': 0.7,
          'line-gradient': [
            'interpolate',
            ['linear'],
            ['line-progress'],
            0,
            tokens.trailRecent,
            0.5,
            tokens.trailMid,
            1,
            tokens.trailOld,
          ],
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      });

      // Click on trail → tooltip with timestamp and coordinates.
      map.on('click', BREADCRUMB_LAYER, (e) => {
        const feature = e.features?.[0];
        const props = feature?.properties as
          | { index?: number; timestamp?: string }
          | undefined;
        if (props?.index == null) return;

        const point = breadcrumb[props.index];
        if (!point) return;

        const time = new Intl.DateTimeFormat(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(new Date(point.timestamp));

        new maplibregl.Popup()
          .setLngLat([point.longitude, point.latitude])
          .setHTML(
            `<div style="font-size:12px;line-height:1.5">
               ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}<br/>
               ${t('breadcrumbPoint', { time })}
             </div>`,
          )
          .addTo(map);
      });
    }
  }, [breadcrumb, showBreadcrumb, mapReady, isDark, t]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
        aria-label="Offline map view"
        role="application"
      />
      {indicator && (
        <div
          style={{
            position: 'absolute',
            top: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              height: '3rem',
              width: '3rem',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '9999px',
              background: 'rgba(255,255,255,0.9)',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              transform: `rotate(${indicator.angle}deg)`,
            }}
            aria-label={`Station bearing ${Math.round(indicator.angle)}°`}
          >
            <Navigation
              style={{ height: '1.75rem', width: '1.75rem', color: '#f97316' }}
              fill="currentColor"
            />
          </div>
          <span
            style={{
              borderRadius: '9999px',
              background: 'rgba(255,255,255,0.8)',
              padding: '0.125rem 0.5rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#374151',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            }}
          >
            {indicator.distanceKm >= 100
              ? `${Math.round(indicator.distanceKm)} km`
              : `${indicator.distanceKm.toFixed(1)} km`}
          </span>
        </div>
      )}
      {tileError && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            bottom: '50%',
            left: '50%',
            transform: 'translate(-50%, 50%)',
            background: 'var(--background)',
            border: '1px solid var(--foreground)',
            borderRadius: '8px',
            padding: '1rem',
            textAlign: 'center',
            zIndex: 10,
          }}
        >
          <p style={{ color: 'var(--foreground)', margin: 0 }}>
            {t('tileError')}
          </p>
        </div>
      )}
    </div>
  );
}
