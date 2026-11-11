'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth, useAuthGuard } from '@hermes/shared-auth';
import { ChevronLeft } from 'lucide-react';
import { useTheme, ErrorBanner, LoadingSpinner } from '@hermes/ui';
import type { GpsPoint } from '@hermes/api';
import { useGpsCoords } from '@/hooks/useGpsCoords';
import { useGpsHistory } from '@/hooks/useGpsHistory';
import { useGpsStations } from '@/hooks/useGpsStations';
import { clearGpsCache } from '@/lib/gpsCache';
import GpsSidePanel from '@/components/GpsSidePanel';
import SosButton from '@/components/SosButton';
import TripsPanel from '@/components/TripsPanel';
import GpsFilesPanel from '@/components/GpsFilesPanel';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

/**
 * GPS main page — full-screen map with a compact bottom panel.
 *
 * Layout goals:
 * - Lat/Lon rendered as compact, left-aligned copy buttons.
 * - Action buttons (refresh, recenter, trips, trail, SOS) consolidated into a
 *   single clearly-organized control row.
 * - Status badges show GPS fix quality and logging state; a separate strip
 *   shows the fix time and radio telemetry (TX/RX, frequency, mode, power).
 *
 * @example
 * // Rendered at /gps in co-deployed mode
 * <GpsPage />
 */
export default function GpsPage() {
  const t = useTranslations('gps');
  const tc = useTranslations('common');
  const user = useAuthGuard();
  const { isAuthenticated, user: authUser } = useAuth();
  const { theme } = useTheme();
  const { position, fix, loading, error, stale, isCached, cacheAgeMs, refresh } =
    useGpsCoords();
  const { history, appendPosition, refresh: refreshHistory } = useGpsHistory();
  const stations = useGpsStations();

  const [showTrail, setShowTrail] = useState(false);
  const [recenterToken, setRecenterToken] = useState(0);
  const [tripsOpen, setTripsOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  // A selected trip's breadcrumb overrides the live trail until cleared.
  const [tripTrail, setTripTrail] = useState<GpsPoint[] | null>(null);

  const breadcrumb = tripTrail ?? history;
  // A selected trip's trail is always shown; the toggle only governs the live trail.
  const showBreadcrumb = tripTrail !== null || showTrail;
  const viewingTrip = tripTrail !== null;

  // Append new live positions to the breadcrumb history
  const prevTimestampRef = useRef<string | null>(null);
  const SHELL_URL = process.env.NEXT_PUBLIC_SHELL_URL ?? 'localhost:4000';

  useEffect(() => {
    if (
      position &&
      position.at &&
      position.latitude != null &&
      position.longitude != null &&
      position.at !== prevTimestampRef.current
    ) {
      prevTimestampRef.current = position.at;
      appendPosition({
        at: position.at,
        latitude: position.latitude,
        longitude: position.longitude,
        altitude_m: position.altitude_m,
      });
    }
  }, [position, appendPosition]);

  // Clear cached GPS position when the user logs out (ADR-003).
  const prevAuthRef = useRef(isAuthenticated);
  useEffect(() => {
    if (prevAuthRef.current && !isAuthenticated) {
      clearGpsCache();
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <LoadingSpinner label={t('loading')} />
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col landscape:flex-row">
      {/* Map region fills remaining space */}
      <div className="relative min-h-0 min-w-0 flex-1">
        <div className="absolute inset-0">
          <MapView
            latitude={position?.latitude ?? null}
            longitude={position?.longitude ?? null}
            heading={null}
            hdop={null}
            isDark={theme === 'dark'}
            breadcrumb={breadcrumb}
            showBreadcrumb={showBreadcrumb}
            stations={stations.stations}
            recenterToken={recenterToken}
          />
        </div>

        {/* Back link overlay */}
        <Link
          href={{ pathname: SHELL_URL }}
          className="inline-flex left-4 top-4 z-10 rounded-lg bg-background/80 px-3 py-2 text-sm text-blue-500 backdrop-blur-sm"
          aria-label={tc('backToHermes')}>
          <ChevronLeft/>{tc('backToHermes')}
        </Link>

        {/* Error banner */}
        {error && (
          <div className="absolute left-4 right-4 top-16 z-10">
            <ErrorBanner message={error} />
          </div>
        )}

        <SosButton hasPosition={position != null} />
      </div>

      <GpsSidePanel
        authUser={authUser}
        position={position}
        fix={fix}
        loading={loading}
        stale={stale}
        isCached={isCached}
        cacheAgeMs={cacheAgeMs}
        onRefresh={refresh}
        showTrail={showTrail}
        trailPointCount={history.length}
        viewingTrip={viewingTrip}
        tripPointCount={breadcrumb.length}
        onToggleTrail={() => setShowTrail((v) => !v)}
        onClearTrip={() => setTripTrail(null)}
        onRecenter={() => setRecenterToken((v) => v + 1)}
        onOpenTrips={() => setTripsOpen(true)}
        onOpenFiles={() => setFilesOpen(true)}
      />

      {/* Trips history drawer */}
      {tripsOpen && (
        <TripsPanel
          onClose={() => setTripsOpen(false)}
          onViewTrip={(points) => setTripTrail(points)}
          onTripClosed={() => {
            void refreshHistory();
          }}
          role={authUser?.role}
        />
      )}

      {/* GPS files drawer */}
      {filesOpen && (
        <GpsFilesPanel
          onClose={() => setFilesOpen(false)}
          settings={position?.settings}
          role={authUser?.role}
        />
      )}
    </main>
  );
}
