'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { buildStyle } from '@/lib/mapStyle';

export interface MapViewProps {
  /** Latitude in decimal degrees */
  latitude: number | null;
  /** Longitude in decimal degrees */
  longitude: number | null;
  /** Whether to use dark theme */
  isDark: boolean;
  /** Callback when tile loading fails */
  onTileError?: () => void;
}

/**
 * Offline-capable map component using Maplibre GL JS + PMTiles.
 *
 * Renders a full-screen map with the station position marker.
 * Theme-aware (light/dark styles). Error overlay when tiles
 * cannot be loaded.
 *
 * @example
 * <MapView
 *   latitude={-23.45}
 *   longitude={-46.78}
 *   isDark={theme === 'dark'}
 *   onTileError={() => setTileError(true)}
 * />
 */
export default function MapView({
  latitude,
  longitude,
  isDark,
  onTileError,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [tileError, setTileError] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

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
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update map style when theme changes
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    mapRef.current.setStyle(buildStyle(isDark));
  }, [isDark, mapReady]);

  // Update marker position
  useEffect(() => {
    if (!mapRef.current || latitude == null || longitude == null) return;

    // Create marker if it doesn't exist
    if (!markerRef.current) {
      const el = document.createElement('div');
      el.className = 'hermes-marker';
      el.style.cssText = `
        width: 20px;
        height: 20px;
        background-color: #f97316;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 10px rgba(249, 115, 22, 0.6);
        cursor: pointer;
        transition: transform 0.5s ease;
      `;

      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([longitude, latitude])
        .addTo(mapRef.current);
      return;
    }

    // Fly to new position
    mapRef.current.flyTo({
      center: [longitude, latitude],
      duration: 1500,
      essential: true,
    });

    markerRef.current.setLngLat([longitude, latitude]);
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

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
        aria-label="Offline map view"
        role="application"
      />
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
            Map tiles not found. Run npm run download-tiles to fetch offline
            map data.
          </p>
        </div>
      )}
    </div>
  );
}