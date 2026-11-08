'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth, useAuthGuard } from '@hermes/shared-auth';
import { ChevronLeft, Loader2, Siren } from 'lucide-react';
import { useTheme, ErrorBanner, LoadingSpinner, ConfirmDialog } from '@hermes/ui';
import type { GpsPoint } from '@hermes/api';
import { useGpsCoords } from '@/hooks/useGpsCoords';
import { useGpsHistory } from '@/hooks/useGpsHistory';
import { useSosEmergency } from '@/hooks/useSosEmergency';
import { useGpsStations } from '@/hooks/useGpsStations';
import { clearGpsCache } from '@/lib/gpsCache';
import GpsSidePanel from '@/components/GpsSidePanel';
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
  const sos = useSosEmergency();
  const [sosDialog, setSosDialog] = useState<'send' | 'clear' | null>(null);

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

        {/* SOS — prominent emergency action, separated from the panel */}
        <button
          onClick={() => setSosDialog(sos.emergency > 0 ? 'clear' : 'send')}
          disabled={sos.sending || sos.clearing || (sos.emergency === 0 && !position)}
          aria-label={sos.emergency > 0 ? t('sosActive') : t('sosButton')}
          title={sos.emergency > 0 ? t('sosActiveTooltip') : t('sosButtonTooltip')}
          className={
            sos.emergency > 0
              ? 'absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-full bg-red-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-700/40 animate-pulse disabled:opacity-50 disabled:cursor-not-allowed'
              : 'absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/30 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed'
          }
          style={{ minHeight: '44px', minWidth: '44px' }}
        >
          {sos.sending || sos.clearing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Siren className="h-5 w-5" />
          )}
          <span className="hidden sm:inline">
            {sos.sending
              ? t('sosSending')
              : sos.emergency > 0
                ? t('sosActive')
                : t('sosButton')}
          </span>
        </button>

        {/* SOS error feedback */}
        {sos.error && (
          <div
            role="alert"
            className="absolute bottom-20 right-4 z-20 max-w-xs rounded-lg bg-red-100 px-3 py-2 text-xs text-red-700 dark:bg-red-900 dark:text-red-200"
          >
            {t('sosError', { message: sos.error })}
          </div>
        )}

        {/* SOS confirm dialog (send or clear) */}
        <ConfirmDialog
          open={sosDialog !== null}
          title={sosDialog === 'clear' ? t('sosClearConfirmTitle') : t('sosConfirmTitle')}
          message={sosDialog === 'clear' ? t('sosClearConfirmMessage') : t('sosConfirmMessage')}
          confirmLabel={sosDialog === 'clear' ? t('sosClear') : tc('send')}
          cancelLabel={tc('cancel')}
          onConfirm={() => {
            const action = sosDialog;
            setSosDialog(null);
            if (action === 'clear') void sos.clearSos();
            else void sos.sendSos(1);
          }}
          onCancel={() => setSosDialog(null)}
        />
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
